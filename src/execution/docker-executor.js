import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import { BaseExecutor } from './base-executor.js';
import { getTTYFlags } from '../lib/utils.js';

/**
 * Docker Executor - Execute commands in Docker containers
 *
 * This executor wraps Docker and Docker Compose operations,
 * using container mappings from configuration.
 */
export class DockerExecutor extends BaseExecutor {
  constructor(config) {
    super(config);
    this.docker = config.docker || {};
    this.containers = this.docker.containers || {};
    this.composeFile = this.docker.composeFile || 'docker-compose.yml';
    this.envFile = config.paths?.envFile || '.env';
    this.projectRoot = config.paths?.projectRoot || process.cwd();
  }

  /**
   * Check if Docker is running
   */
  async isAvailable() {
    try {
      await execa('docker', ['info'], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Docker information
   */
  getInfo() {
    return {
      type: 'docker',
      composeFile: this.composeFile,
      containers: this.containers,
      envFile: this.envFile,
    };
  }

  /**
   * Resolve service name to container name
   */
  resolveService(service) {
    return this.containers[service] || null;
  }

  /**
   * Find the actual compose file path
   */
  findComposeFile() {
    const preferredPath = path.isAbsolute(this.composeFile)
      ? this.composeFile
      : path.join(this.projectRoot, this.composeFile);

    if (fs.existsSync(preferredPath)) {
      return preferredPath;
    }

    // Try common variants
    const variants = [
      'compose.yaml',
      'compose.yml',
      'docker-compose.yaml',
      'docker-compose.yml',
    ];

    for (const variant of variants) {
      const filePath = path.join(this.projectRoot, variant);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Get the env file path if it exists
   */
  getEnvFilePath() {
    const envPath = path.isAbsolute(this.envFile)
      ? this.envFile
      : path.join(this.projectRoot, this.envFile);

    return fs.existsSync(envPath) ? envPath : null;
  }

  /**
   * Execute a command directly (not in a container)
   */
  async run(command, args = [], options = {}) {
    const execaOptions = {
      cwd: options.workingDir || this.projectRoot,
      env: options.env,
      stdio: options.interactive ? 'inherit' : 'pipe',
      ...options,
    };

    try {
      const result = await execa(command, args, execaOptions);
      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode || 0,
      };
    } catch (error) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.exitCode || 1,
      };
    }
  }

  /**
   * Execute a command inside a container
   */
  async runInService(service, command, args = [], options = {}) {
    const container = this.resolveService(service);
    if (!container) {
      throw new Error(`Service "${service}" is not configured in containers mapping`);
    }

    await this.ensureDockerRunning();

    const hasCustomIO = 'stdin' in options || 'stdout' in options ||
      'stderr' in options || 'input' in options || 'stdio' in options;

    const ttyFlags = hasCustomIO ? ['-i'] : getTTYFlags();
    const execArgs = ['exec', ...ttyFlags, container, command, ...args];

    const execaOptions = {
      ...(hasCustomIO ? {} : { stdio: 'inherit' }),
      ...options,
    };

    try {
      const result = await execa('docker', execArgs, execaOptions);
      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode || 0,
      };
    } catch (error) {
      if (options.stdio === 'inherit') {
        // Error already displayed to user
        return {
          stdout: '',
          stderr: '',
          exitCode: error.exitCode || 1,
        };
      }
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.exitCode || 1,
      };
    }
  }

  /**
   * Run docker compose command
   */
  async compose(args = [], options = {}) {
    await this.ensureDockerRunning();

    const composeFile = this.findComposeFile();
    if (!composeFile) {
      throw new Error(`No Docker Compose file found in ${this.projectRoot}`);
    }

    const composeArgs = ['compose'];
    const envFile = this.getEnvFilePath();

    if (envFile) {
      composeArgs.push('--env-file', envFile);
    }

    composeArgs.push('-f', composeFile, ...args);

    const execaOptions = {
      stdio: options.stdio || 'inherit',
      cwd: this.projectRoot,
      ...options,
    };

    return execa('docker', composeArgs, execaOptions);
  }

  /**
   * Start services
   */
  async start(services = [], options = {}) {
    const args = ['up', '-d'];

    if (options.build) {
      args.push('--build');
    }

    if (services.length > 0) {
      args.push(...services);
    }

    return this.compose(args, options);
  }

  /**
   * Stop services
   */
  async stop(services = [], options = {}) {
    const args = ['down'];

    if (services.length > 0) {
      // For specific services, use stop instead of down
      return this.compose(['stop', ...services], options);
    }

    return this.compose(args, options);
  }

  /**
   * Restart services
   */
  async restart(services = [], options = {}) {
    const args = ['restart'];

    if (services.length > 0) {
      args.push(...services);
    }

    return this.compose(args, options);
  }

  /**
   * Get service status
   */
  async status(services = []) {
    try {
      const args = ['ps', '--format', 'json'];

      if (services.length > 0) {
        args.push(...services);
      }

      const result = await this.compose(args, { stdio: 'pipe' });
      const lines = result.stdout.trim().split('\n').filter(Boolean);

      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
    } catch {
      return [];
    }
  }

  /**
   * Get service logs
   */
  async logs(services = [], options = {}) {
    const args = ['logs'];

    if (options.follow) {
      args.push('-f');
    }

    if (options.tail) {
      args.push('--tail', String(options.tail));
    }

    if (services.length > 0) {
      args.push(...services);
    }

    return this.compose(args, { stdio: 'inherit' });
  }

  /**
   * Get running containers
   */
  async getRunningContainers(nameFilter = '') {
    try {
      const args = ['ps', '--format', '{{.Names}}'];

      if (nameFilter) {
        args.push('--filter', `name=${nameFilter}`);
      }

      const { stdout } = await execa('docker', args, { stdio: 'pipe' });
      return stdout.trim().split('\n').filter(name => name.trim());
    } catch {
      return [];
    }
  }

  /**
   * Get container stats
   */
  async getStats(containers = []) {
    const args = [
      'stats',
      '--no-stream',
      '--format',
      'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'
    ];

    if (containers.length > 0) {
      args.push(...containers);
    }

    const { stdout } = await execa('docker', args, { stdio: 'pipe' });
    return stdout;
  }

  /**
   * Build services
   */
  async build(services = [], options = {}) {
    const args = ['build'];

    if (options.noCache) {
      args.push('--no-cache');
    }

    if (services.length > 0) {
      args.push(...services);
    }

    return this.compose(args, options);
  }

  /**
   * Ensure Docker is running, throw helpful error if not
   */
  async ensureDockerRunning() {
    const available = await this.isAvailable();
    if (!available) {
      const error = new Error('Docker is not running');
      error.code = 'DOCKER_NOT_RUNNING';
      error.help = [
        'Please start Docker Desktop and try again.',
        '',
        'Platform-specific instructions:',
        '  macOS: Open Docker from Applications or run: open -a Docker',
        '  Linux: Run: sudo systemctl start docker',
        '  WSL2:  Make sure Docker Desktop is running on Windows',
      ];
      throw error;
    }
  }
}
