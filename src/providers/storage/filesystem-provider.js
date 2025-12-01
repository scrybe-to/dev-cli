import fs from 'fs';
import path from 'path';
import { BaseStorageProvider } from './base-provider.js';

/**
 * Filesystem Storage Provider
 *
 * Provides local filesystem storage operations for backups, snapshots,
 * and general file management.
 */
export class FilesystemProvider extends BaseStorageProvider {
  constructor(config, fullConfig, executor) {
    super(config, fullConfig, executor);

    this.basePath = config.filesystem?.basePath || './storage';
    this.projectRoot = fullConfig.paths?.projectRoot || process.cwd();
  }

  /**
   * Get provider name
   */
  getName() {
    return 'filesystem';
  }

  /**
   * Get the resolved base path
   */
  getBasePath() {
    return path.isAbsolute(this.basePath)
      ? this.basePath
      : path.join(this.projectRoot, this.basePath);
  }

  /**
   * Resolve a path relative to base
   */
  resolvePath(relativePath) {
    const basePath = this.getBasePath();
    return path.join(basePath, relativePath);
  }

  /**
   * Check if filesystem storage is available
   */
  async isAvailable() {
    const basePath = this.getBasePath();

    try {
      // Check if we can access/create the base path
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files in a directory
   */
  async list(relativePath = '', options = {}) {
    const fullPath = this.resolvePath(relativePath);

    if (!fs.existsSync(fullPath)) {
      return [];
    }

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry.name);
      const stats = fs.statSync(entryPath);

      results.push({
        name: entry.name,
        path: path.join(relativePath, entry.name),
        isDirectory: entry.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
      });
    }

    // Sort by name by default
    if (options.sort === 'modified') {
      results.sort((a, b) => b.modified - a.modified);
    } else if (options.sort === 'size') {
      results.sort((a, b) => b.size - a.size);
    } else {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return results;
  }

  /**
   * Upload/copy a file to storage
   */
  async upload(localPath, remotePath, options = {}) {
    const destPath = this.resolvePath(remotePath);
    const destDir = path.dirname(destPath);

    // Ensure destination directory exists
    this.ensureLocalDirectory(destDir);

    // Copy the file
    fs.copyFileSync(localPath, destPath);
  }

  /**
   * Download/copy a file from storage
   */
  async download(remotePath, localPath, options = {}) {
    const sourcePath = this.resolvePath(remotePath);
    const destDir = path.dirname(localPath);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`File not found: ${remotePath}`);
    }

    // Ensure destination directory exists
    this.ensureLocalDirectory(destDir);

    // Copy the file
    fs.copyFileSync(sourcePath, localPath);
  }

  /**
   * Delete a file or directory
   */
  async delete(remotePath, options = {}) {
    const fullPath = this.resolvePath(remotePath);

    if (!fs.existsSync(fullPath)) {
      return; // Already deleted
    }

    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (options.recursive) {
        fs.rmSync(fullPath, { recursive: true });
      } else {
        fs.rmdirSync(fullPath);
      }
    } else {
      fs.unlinkSync(fullPath);
    }
  }

  /**
   * Copy a file within storage
   */
  async copy(sourcePath, destPath, options = {}) {
    const sourceFullPath = this.resolvePath(sourcePath);
    const destFullPath = this.resolvePath(destPath);

    if (!fs.existsSync(sourceFullPath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const destDir = path.dirname(destFullPath);
    this.ensureLocalDirectory(destDir);

    fs.copyFileSync(sourceFullPath, destFullPath);
  }

  /**
   * Move/rename a file within storage
   */
  async move(sourcePath, destPath, options = {}) {
    const sourceFullPath = this.resolvePath(sourcePath);
    const destFullPath = this.resolvePath(destPath);

    if (!fs.existsSync(sourceFullPath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    const destDir = path.dirname(destFullPath);
    this.ensureLocalDirectory(destDir);

    fs.renameSync(sourceFullPath, destFullPath);
  }

  /**
   * Check if a file exists
   */
  async exists(remotePath) {
    const fullPath = this.resolvePath(remotePath);
    return fs.existsSync(fullPath);
  }

  /**
   * Get file information
   */
  async stat(remotePath) {
    const fullPath = this.resolvePath(remotePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${remotePath}`);
    }

    const stats = fs.statSync(fullPath);

    return {
      name: path.basename(fullPath),
      path: remotePath,
      isDirectory: stats.isDirectory(),
      size: stats.size,
      formattedSize: this.formatBytes(stats.size),
      modified: stats.mtime,
      created: stats.birthtime,
      mode: stats.mode,
    };
  }

  /**
   * Create a directory
   */
  async mkdir(remotePath, options = {}) {
    const fullPath = this.resolvePath(remotePath);
    fs.mkdirSync(fullPath, { recursive: options.recursive !== false });
  }

  /**
   * Get storage usage information
   */
  async getUsage() {
    const basePath = this.getBasePath();

    if (!fs.existsSync(basePath)) {
      return {
        used: 0,
        total: 0,
        formatted: '0 Bytes',
      };
    }

    const used = this.getDirectorySize(basePath);

    return {
      used,
      total: null, // Filesystem doesn't have a pre-defined limit
      formatted: this.formatBytes(used),
    };
  }

  /**
   * Calculate total size of a directory
   */
  getDirectorySize(dirPath) {
    let totalSize = 0;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += this.getDirectorySize(entryPath);
      } else {
        const stats = fs.statSync(entryPath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  /**
   * Read file contents
   */
  async readFile(remotePath, encoding = 'utf-8') {
    const fullPath = this.resolvePath(remotePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${remotePath}`);
    }

    return fs.readFileSync(fullPath, encoding);
  }

  /**
   * Write file contents
   */
  async writeFile(remotePath, content, options = {}) {
    const fullPath = this.resolvePath(remotePath);
    const destDir = path.dirname(fullPath);

    this.ensureLocalDirectory(destDir);

    fs.writeFileSync(fullPath, content, options);
  }
}
