/**
 * Base Executor - Abstract interface for command execution contexts
 *
 * All executors (Docker, Native, SSH) inherit from this class and implement
 * the required methods. This enables commands to be execution-agnostic.
 */
export class BaseExecutor {
  constructor(config) {
    if (new.target === BaseExecutor) {
      throw new Error('BaseExecutor is abstract and cannot be instantiated directly');
    }
    this.config = config;
  }

  /**
   * Execute a command in this execution context
   *
   * @param {string} command - The command to execute
   * @param {string[]} args - Command arguments
   * @param {Object} options - Execution options
   * @param {boolean} options.interactive - Whether the command needs TTY
   * @param {string} options.workingDir - Working directory for the command
   * @param {Object} options.env - Additional environment variables
   * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
   */
  async run(command, args = [], options = {}) {
    throw new Error('run() must be implemented by subclass');
  }

  /**
   * Execute a command in a specific service/container context
   * For Docker, this runs in a container. For Native, it may use a specific shell.
   *
   * @param {string} service - Service/container name (from config mapping)
   * @param {string} command - The command to execute
   * @param {string[]} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
   */
  async runInService(service, command, args = [], options = {}) {
    throw new Error('runInService() must be implemented by subclass');
  }

  /**
   * Check if this execution context is available and properly configured
   *
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('isAvailable() must be implemented by subclass');
  }

  /**
   * Get information about this execution context
   *
   * @returns {Object} Context information (name, version, status, etc.)
   */
  getInfo() {
    throw new Error('getInfo() must be implemented by subclass');
  }

  /**
   * Get the resolved name for a service
   * For Docker, this returns the container name. For Native, returns the service key.
   *
   * @param {string} service - Service key from configuration
   * @returns {string|null} Resolved service name or null if not configured
   */
  resolveService(service) {
    throw new Error('resolveService() must be implemented by subclass');
  }

  /**
   * Start services (if applicable)
   *
   * @param {string[]} services - Service names to start (empty for all)
   * @param {Object} options - Start options
   * @returns {Promise<void>}
   */
  async start(services = [], options = {}) {
    throw new Error('start() must be implemented by subclass');
  }

  /**
   * Stop services (if applicable)
   *
   * @param {string[]} services - Service names to stop (empty for all)
   * @param {Object} options - Stop options
   * @returns {Promise<void>}
   */
  async stop(services = [], options = {}) {
    throw new Error('stop() must be implemented by subclass');
  }

  /**
   * Restart services (if applicable)
   *
   * @param {string[]} services - Service names to restart (empty for all)
   * @param {Object} options - Restart options
   * @returns {Promise<void>}
   */
  async restart(services = [], options = {}) {
    throw new Error('restart() must be implemented by subclass');
  }

  /**
   * Get status of services
   *
   * @param {string[]} services - Service names to check (empty for all)
   * @returns {Promise<Object[]>} Array of service status objects
   */
  async status(services = []) {
    throw new Error('status() must be implemented by subclass');
  }

  /**
   * Get logs from services
   *
   * @param {string[]} services - Service names (empty for all)
   * @param {Object} options - Log options (follow, tail, etc.)
   * @returns {Promise<void>}
   */
  async logs(services = [], options = {}) {
    throw new Error('logs() must be implemented by subclass');
  }
}
