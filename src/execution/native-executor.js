import { execa } from 'execa';
import { BaseExecutor } from './base-executor.js';

/**
 * Native Executor - Execute commands locally on the host machine
 *
 * This executor runs commands directly on the local system,
 * useful for non-Docker development workflows.
 */
export class NativeExecutor extends BaseExecutor {
  constructor(config) {
    super(config);
    this.native = config.native || {};
    this.shell = this.native.shell || process.env.SHELL || '/bin/bash';
    this.workingDir = this.native.workingDir || config.paths?.projectRoot || process.cwd();
  }

  /**
   * Check if native execution is available (always true on supported platforms)
   */
  async isAvailable() {
    return true;
  }

  /**
   * Get executor information
   */
  getInfo() {
    return {
      type: 'native',
      shell: this.shell,
      workingDir: this.workingDir,
      platform: process.platform,
      nodeVersion: process.version,
    };
  }

  /**
   * Resolve service name - for native execution, services are just identifiers
   */
  resolveService(service) {
    // In native mode, services are conceptual - return the service name itself
    return service;
  }

  /**
   * Execute a command locally
   */
  async run(command, args = [], options = {}) {
    const execaOptions = {
      cwd: options.workingDir || this.workingDir,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: options.interactive ? 'inherit' : 'pipe',
      shell: options.shell || false,
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
   * Execute a command in a "service" context
   * For native execution, this is the same as run() since there are no containers
   */
  async runInService(service, command, args = [], options = {}) {
    // In native mode, we just run the command directly
    // The service parameter is ignored but could be used for logging/context
    return this.run(command, args, {
      ...options,
      _service: service, // Store for potential debugging
    });
  }

  /**
   * Start services - no-op for native execution
   */
  async start(services = [], options = {}) {
    // Native execution doesn't have services to start
    // This could be extended to start background processes if needed
    return Promise.resolve();
  }

  /**
   * Stop services - no-op for native execution
   */
  async stop(services = [], options = {}) {
    // Native execution doesn't have services to stop
    return Promise.resolve();
  }

  /**
   * Restart services - no-op for native execution
   */
  async restart(services = [], options = {}) {
    // Native execution doesn't have services to restart
    return Promise.resolve();
  }

  /**
   * Get service status - returns basic system info for native execution
   */
  async status(services = []) {
    return [{
      type: 'native',
      status: 'running',
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: this.workingDir,
    }];
  }

  /**
   * Logs - no-op for native execution (no persistent logs)
   */
  async logs(services = [], options = {}) {
    console.log('Native execution mode does not have persistent logs.');
    console.log('Application logs depend on how individual services are configured.');
    return Promise.resolve();
  }

  /**
   * Run a shell command (with shell interpretation)
   */
  async shell_run(command, options = {}) {
    const execaOptions = {
      cwd: options.workingDir || this.workingDir,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: options.interactive ? 'inherit' : 'pipe',
      shell: this.shell,
      ...options,
    };

    try {
      const result = await execa(command, execaOptions);
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
