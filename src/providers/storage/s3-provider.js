import { BaseStorageProvider } from './base-provider.js';
import { loadEnvVars } from '../../lib/utils.js';
import fs from 'fs';

/**
 * S3/MinIO Storage Provider
 *
 * Provides S3-compatible storage operations using the AWS CLI or MinIO client.
 * Works with AWS S3, MinIO, and other S3-compatible services.
 */
export class S3Provider extends BaseStorageProvider {
  constructor(config, fullConfig, executor) {
    super(config, fullConfig, executor);

    const objectStorage = config.objectStorage || {};

    this.endpoint = objectStorage.endpoint || '';
    this.bucket = objectStorage.bucket || '';
    this.region = objectStorage.region || 'us-east-1';

    // Credential handling
    this.credentialSource = objectStorage.credentialSource || 'env';
    this.accessKey = objectStorage.accessKey || '';
    this.secretKey = objectStorage.secretKey || '';

    // CLI tool preference: aws, mc (minio client), or auto
    this.cliTool = objectStorage.cliTool || 'auto';
  }

  /**
   * Get provider name
   */
  getName() {
    return 's3';
  }

  /**
   * Get credentials from environment or config
   */
  getCredentials() {
    if (this.credentialSource === 'config') {
      return {
        accessKey: this.accessKey,
        secretKey: this.secretKey,
      };
    }

    // Load from environment
    const envFile = this.fullConfig.paths?.envFile;
    const env = envFile && fs.existsSync(envFile)
      ? loadEnvVars(envFile)
      : process.env;

    return {
      accessKey: env.AWS_ACCESS_KEY_ID || env.MINIO_ROOT_USER || this.accessKey,
      secretKey: env.AWS_SECRET_ACCESS_KEY || env.MINIO_ROOT_PASSWORD || this.secretKey,
    };
  }

  /**
   * Get the base path (bucket)
   */
  getBasePath() {
    return this.bucket;
  }

  /**
   * Detect which CLI tool to use
   */
  async detectCLITool() {
    if (this.cliTool !== 'auto') {
      return this.cliTool;
    }

    // Try mc (MinIO client) first as it's more flexible
    try {
      await this.executor.run('mc', ['--version'], { stdio: 'pipe' });
      return 'mc';
    } catch {
      // Fallback to aws cli
      try {
        await this.executor.run('aws', ['--version'], { stdio: 'pipe' });
        return 'aws';
      } catch {
        throw new Error('No S3 CLI tool found. Install either AWS CLI or MinIO Client (mc).');
      }
    }
  }

  /**
   * Get environment variables for S3 operations
   */
  getEnvVars() {
    const creds = this.getCredentials();
    return {
      AWS_ACCESS_KEY_ID: creds.accessKey,
      AWS_SECRET_ACCESS_KEY: creds.secretKey,
      AWS_DEFAULT_REGION: this.region,
    };
  }

  /**
   * Configure MinIO client alias
   */
  async configureMC() {
    const creds = this.getCredentials();
    const alias = 's3storage'; // Use a generic alias

    await this.executor.run('mc', [
      'alias', 'set', alias,
      this.endpoint || 'https://s3.amazonaws.com',
      creds.accessKey,
      creds.secretKey,
    ], {
      stdio: 'pipe',
    });

    return alias;
  }

  /**
   * Check if S3 storage is available
   */
  async isAvailable() {
    if (!this.bucket) {
      return false;
    }

    try {
      const tool = await this.detectCLITool();

      if (tool === 'mc') {
        const alias = await this.configureMC();
        const result = await this.executor.run('mc', ['ls', `${alias}/${this.bucket}`], {
          stdio: 'pipe',
          env: this.getEnvVars(),
        });
        return result.exitCode === 0;
      } else {
        // AWS CLI
        const args = ['s3', 'ls', `s3://${this.bucket}`];
        if (this.endpoint) {
          args.push('--endpoint-url', this.endpoint);
        }
        const result = await this.executor.run('aws', args, {
          stdio: 'pipe',
          env: this.getEnvVars(),
        });
        return result.exitCode === 0;
      }
    } catch {
      return false;
    }
  }

  /**
   * List files in bucket/path
   */
  async list(remotePath = '', options = {}) {
    const tool = await this.detectCLITool();
    const results = [];

    if (tool === 'mc') {
      const alias = await this.configureMC();
      const path = remotePath ? `${alias}/${this.bucket}/${remotePath}` : `${alias}/${this.bucket}`;

      const result = await this.executor.run('mc', ['ls', '--json', path], {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });

      if (result.exitCode === 0 && result.stdout) {
        const lines = result.stdout.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            results.push({
              name: item.key,
              path: remotePath ? `${remotePath}/${item.key}` : item.key,
              isDirectory: item.type === 'folder',
              size: item.size || 0,
              modified: item.lastModified ? new Date(item.lastModified) : null,
            });
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } else {
      // AWS CLI
      const s3Path = remotePath ? `s3://${this.bucket}/${remotePath}/` : `s3://${this.bucket}/`;
      const args = ['s3', 'ls', s3Path];

      if (this.endpoint) {
        args.push('--endpoint-url', this.endpoint);
      }

      const result = await this.executor.run('aws', args, {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });

      if (result.exitCode === 0 && result.stdout) {
        const lines = result.stdout.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          // Parse aws s3 ls output format
          const prefixMatch = line.match(/^\s*PRE\s+(.+)\/$/);
          const fileMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\d+)\s+(.+)$/);

          if (prefixMatch) {
            results.push({
              name: prefixMatch[1],
              path: remotePath ? `${remotePath}/${prefixMatch[1]}` : prefixMatch[1],
              isDirectory: true,
              size: 0,
              modified: null,
            });
          } else if (fileMatch) {
            results.push({
              name: fileMatch[3],
              path: remotePath ? `${remotePath}/${fileMatch[3]}` : fileMatch[3],
              isDirectory: false,
              size: parseInt(fileMatch[2], 10),
              modified: new Date(fileMatch[1]),
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Upload a file
   */
  async upload(localPath, remotePath, options = {}) {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file not found: ${localPath}`);
    }

    const tool = await this.detectCLITool();

    if (tool === 'mc') {
      const alias = await this.configureMC();
      await this.executor.run('mc', [
        'cp', localPath, `${alias}/${this.bucket}/${remotePath}`
      ], {
        stdio: options.quiet ? 'pipe' : 'inherit',
        env: this.getEnvVars(),
      });
    } else {
      const args = ['s3', 'cp', localPath, `s3://${this.bucket}/${remotePath}`];
      if (this.endpoint) {
        args.push('--endpoint-url', this.endpoint);
      }
      await this.executor.run('aws', args, {
        stdio: options.quiet ? 'pipe' : 'inherit',
        env: this.getEnvVars(),
      });
    }
  }

  /**
   * Download a file
   */
  async download(remotePath, localPath, options = {}) {
    const tool = await this.detectCLITool();

    // Ensure local directory exists
    const localDir = require('path').dirname(localPath);
    this.ensureLocalDirectory(localDir);

    if (tool === 'mc') {
      const alias = await this.configureMC();
      await this.executor.run('mc', [
        'cp', `${alias}/${this.bucket}/${remotePath}`, localPath
      ], {
        stdio: options.quiet ? 'pipe' : 'inherit',
        env: this.getEnvVars(),
      });
    } else {
      const args = ['s3', 'cp', `s3://${this.bucket}/${remotePath}`, localPath];
      if (this.endpoint) {
        args.push('--endpoint-url', this.endpoint);
      }
      await this.executor.run('aws', args, {
        stdio: options.quiet ? 'pipe' : 'inherit',
        env: this.getEnvVars(),
      });
    }
  }

  /**
   * Delete a file or prefix
   */
  async delete(remotePath, options = {}) {
    const tool = await this.detectCLITool();

    if (tool === 'mc') {
      const alias = await this.configureMC();
      const args = ['rm'];
      if (options.recursive) {
        args.push('--recursive', '--force');
      }
      args.push(`${alias}/${this.bucket}/${remotePath}`);

      await this.executor.run('mc', args, {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });
    } else {
      const args = ['s3', 'rm', `s3://${this.bucket}/${remotePath}`];
      if (options.recursive) {
        args.push('--recursive');
      }
      if (this.endpoint) {
        args.push('--endpoint-url', this.endpoint);
      }
      await this.executor.run('aws', args, {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });
    }
  }

  /**
   * Copy a file within S3
   */
  async copy(sourcePath, destPath, options = {}) {
    const tool = await this.detectCLITool();

    if (tool === 'mc') {
      const alias = await this.configureMC();
      await this.executor.run('mc', [
        'cp',
        `${alias}/${this.bucket}/${sourcePath}`,
        `${alias}/${this.bucket}/${destPath}`
      ], {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });
    } else {
      const args = [
        's3', 'cp',
        `s3://${this.bucket}/${sourcePath}`,
        `s3://${this.bucket}/${destPath}`
      ];
      if (this.endpoint) {
        args.push('--endpoint-url', this.endpoint);
      }
      await this.executor.run('aws', args, {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });
    }
  }

  /**
   * Move a file within S3
   */
  async move(sourcePath, destPath, options = {}) {
    const tool = await this.detectCLITool();

    if (tool === 'mc') {
      const alias = await this.configureMC();
      await this.executor.run('mc', [
        'mv',
        `${alias}/${this.bucket}/${sourcePath}`,
        `${alias}/${this.bucket}/${destPath}`
      ], {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });
    } else {
      const args = [
        's3', 'mv',
        `s3://${this.bucket}/${sourcePath}`,
        `s3://${this.bucket}/${destPath}`
      ];
      if (this.endpoint) {
        args.push('--endpoint-url', this.endpoint);
      }
      await this.executor.run('aws', args, {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });
    }
  }

  /**
   * Check if a file exists
   */
  async exists(remotePath) {
    try {
      await this.stat(remotePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file information
   */
  async stat(remotePath) {
    const tool = await this.detectCLITool();

    if (tool === 'mc') {
      const alias = await this.configureMC();
      const result = await this.executor.run('mc', [
        'stat', '--json', `${alias}/${this.bucket}/${remotePath}`
      ], {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });

      if (result.exitCode !== 0) {
        throw new Error(`File not found: ${remotePath}`);
      }

      const info = JSON.parse(result.stdout);
      return {
        name: info.name,
        path: remotePath,
        isDirectory: info.type === 'folder',
        size: info.size || 0,
        formattedSize: this.formatBytes(info.size || 0),
        modified: info.lastModified ? new Date(info.lastModified) : null,
        etag: info.etag,
      };
    } else {
      const args = ['s3api', 'head-object', '--bucket', this.bucket, '--key', remotePath];
      if (this.endpoint) {
        args.push('--endpoint-url', this.endpoint);
      }

      const result = await this.executor.run('aws', args, {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });

      if (result.exitCode !== 0) {
        throw new Error(`File not found: ${remotePath}`);
      }

      const info = JSON.parse(result.stdout);
      return {
        name: remotePath.split('/').pop(),
        path: remotePath,
        isDirectory: false,
        size: info.ContentLength || 0,
        formattedSize: this.formatBytes(info.ContentLength || 0),
        modified: info.LastModified ? new Date(info.LastModified) : null,
        etag: info.ETag,
        contentType: info.ContentType,
      };
    }
  }

  /**
   * Create a "directory" (prefix) - not actually needed in S3
   */
  async mkdir(remotePath, options = {}) {
    // S3 doesn't have real directories, but we can create an empty object
    // to simulate a directory marker
    const tool = await this.detectCLITool();
    const markerPath = remotePath.endsWith('/') ? remotePath : `${remotePath}/`;

    if (tool === 'mc') {
      // mc doesn't need explicit directory creation
      return;
    } else {
      // Create empty object as directory marker
      const args = [
        's3api', 'put-object',
        '--bucket', this.bucket,
        '--key', markerPath,
        '--content-length', '0'
      ];
      if (this.endpoint) {
        args.push('--endpoint-url', this.endpoint);
      }
      await this.executor.run('aws', args, {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });
    }
  }

  /**
   * Get storage usage information
   */
  async getUsage() {
    // This is a simplified implementation
    // For more accurate results, you'd need to iterate all objects
    const tool = await this.detectCLITool();

    if (tool === 'mc') {
      const alias = await this.configureMC();
      const result = await this.executor.run('mc', [
        'du', '--json', `${alias}/${this.bucket}`
      ], {
        stdio: 'pipe',
        env: this.getEnvVars(),
      });

      if (result.exitCode === 0 && result.stdout) {
        try {
          const info = JSON.parse(result.stdout);
          return {
            used: info.size || 0,
            total: null,
            formatted: this.formatBytes(info.size || 0),
          };
        } catch {
          // Parse error
        }
      }
    }

    return {
      used: 0,
      total: null,
      formatted: 'Unknown',
    };
  }
}
