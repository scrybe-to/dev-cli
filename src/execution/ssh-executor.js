import { execa } from 'execa';
import { BaseExecutor } from './base-executor.js';

/**
 * SSH Executor - Execute commands on a remote server via SSH
 *
 * This executor runs commands over SSH, useful for managing
 * remote development or staging environments.
 */
export class SSHExecutor extends BaseExecutor {
  constructor(config) {
    super(config);
    this.ssh = config.ssh || {};
    this.host = this.ssh.host;
    this.user = this.ssh.user || process.env.USER;
    this.port = this.ssh.port || 22;
    this.keyPath = this.ssh.keyPath;
    this.workingDir = this.ssh.workingDir || '~';
  }

  /**
   * Build SSH connection arguments
   */
  getSSHArgs() {
    const args = [];

    if (this.keyPath) {
      args.push('-i', this.keyPath);
    }

    if (this.port !== 22) {
      args.push('-p', String(this.port));
    }

    // Disable strict host key checking for convenience (can be configured)
    if (this.ssh.strictHostKeyChecking === false) {
      args.push('-o', 'StrictHostKeyChecking=no');
    }

    return args;
  }

  /**
   * Get SSH destination string
   */
  getDestination() {
    return this.user ? `${this.user}@${this.host}` : this.host;
  }

  /**
   * Check if SSH connection is available
   */
  async isAvailable() {
    if (!this.host) {
      return false;
    }

    try {
      const args = [...this.getSSHArgs(), this.getDestination(), 'echo', 'ok'];
      const result = await execa('ssh', args, {
        stdio: 'pipe',
        timeout: 10000, // 10 second timeout
      });
      return result.stdout.trim() === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Get executor information
   */
  getInfo() {
    return {
      type: 'ssh',
      host: this.host,
      user: this.user,
      port: this.port,
      keyPath: this.keyPath,
      workingDir: this.workingDir,
    };
  }

  /**
   * Resolve service name - for SSH, services are identifiers
   */
  resolveService(service) {
    return service;
  }

  /**
   * Execute a command on the remote server
   */
  async run(command, args = [], options = {}) {
    if (!this.host) {
      throw new Error('SSH host is not configured');
    }

    const remoteWorkingDir = options.workingDir || this.workingDir;

    // Build the remote command
    const remoteCommand = args.length > 0
      ? `cd ${remoteWorkingDir} && ${command} ${args.map(a => `'${a}'`).join(' ')}`
      : `cd ${remoteWorkingDir} && ${command}`;

    const sshArgs = [
      ...this.getSSHArgs(),
      this.getDestination(),
      remoteCommand,
    ];

    const execaOptions = {
      stdio: options.interactive ? 'inherit' : 'pipe',
      ...options,
    };

    // Add TTY flag for interactive sessions
    if (options.interactive) {
      sshArgs.splice(sshArgs.length - 1, 0, '-t');
    }

    try {
      const result = await execa('ssh', sshArgs, execaOptions);
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
   * Execute a command in a service context
   * For SSH, this can be extended to support remote Docker containers
   */
  async runInService(service, command, args = [], options = {}) {
    // If the remote has Docker, we could run in a container there
    // For now, just run the command directly on the remote
    return this.run(command, args, {
      ...options,
      _service: service,
    });
  }

  /**
   * Start services on remote - can run remote docker compose
   */
  async start(services = [], options = {}) {
    // This could be extended to run docker compose up on the remote
    const args = ['compose', 'up', '-d'];
    if (services.length > 0) {
      args.push(...services);
    }
    return this.run('docker', args, options);
  }

  /**
   * Stop services on remote
   */
  async stop(services = [], options = {}) {
    const args = services.length > 0
      ? ['compose', 'stop', ...services]
      : ['compose', 'down'];
    return this.run('docker', args, options);
  }

  /**
   * Restart services on remote
   */
  async restart(services = [], options = {}) {
    const args = ['compose', 'restart'];
    if (services.length > 0) {
      args.push(...services);
    }
    return this.run('docker', args, options);
  }

  /**
   * Get service status on remote
   */
  async status(services = []) {
    try {
      const args = ['compose', 'ps', '--format', 'json'];
      if (services.length > 0) {
        args.push(...services);
      }

      const result = await this.run('docker', args, { stdio: 'pipe' });
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
   * Get logs from remote services
   */
  async logs(services = [], options = {}) {
    const args = ['compose', 'logs'];

    if (options.follow) {
      args.push('-f');
    }

    if (options.tail) {
      args.push('--tail', String(options.tail));
    }

    if (services.length > 0) {
      args.push(...services);
    }

    return this.run('docker', args, { interactive: true });
  }

  /**
   * Copy files to remote server
   */
  async copyTo(localPath, remotePath, options = {}) {
    const scpArgs = [];

    if (this.keyPath) {
      scpArgs.push('-i', this.keyPath);
    }

    if (this.port !== 22) {
      scpArgs.push('-P', String(this.port));
    }

    if (options.recursive) {
      scpArgs.push('-r');
    }

    scpArgs.push(localPath, `${this.getDestination()}:${remotePath}`);

    try {
      const result = await execa('scp', scpArgs, { stdio: 'pipe' });
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
   * Copy files from remote server
   */
  async copyFrom(remotePath, localPath, options = {}) {
    const scpArgs = [];

    if (this.keyPath) {
      scpArgs.push('-i', this.keyPath);
    }

    if (this.port !== 22) {
      scpArgs.push('-P', String(this.port));
    }

    if (options.recursive) {
      scpArgs.push('-r');
    }

    scpArgs.push(`${this.getDestination()}:${remotePath}`, localPath);

    try {
      const result = await execa('scp', scpArgs, { stdio: 'pipe' });
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
}
