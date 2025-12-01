import { DockerExecutor } from './docker-executor.js';
import { NativeExecutor } from './native-executor.js';
import { SSHExecutor } from './ssh-executor.js';

/**
 * Supported execution modes
 */
export const ExecutionMode = {
  DOCKER: 'docker',
  NATIVE: 'native',
  SSH: 'ssh',
};

/**
 * Create an executor based on configuration
 *
 * @param {Object} config - Full CLI configuration
 * @returns {BaseExecutor} The appropriate executor instance
 * @throws {Error} If execution mode is not recognized
 */
export function createExecutor(config) {
  const mode = config.execution?.mode || ExecutionMode.DOCKER;

  switch (mode) {
    case ExecutionMode.DOCKER:
      return new DockerExecutor({
        docker: config.execution?.docker || {},
        paths: config.paths || {},
      });

    case ExecutionMode.NATIVE:
      return new NativeExecutor({
        native: config.execution?.native || {},
        paths: config.paths || {},
      });

    case ExecutionMode.SSH:
      return new SSHExecutor({
        ssh: config.execution?.ssh || {},
        paths: config.paths || {},
      });

    default:
      throw new Error(
        `Unknown execution mode: "${mode}". ` +
        `Supported modes: ${Object.values(ExecutionMode).join(', ')}`
      );
  }
}

/**
 * Get executor class for a mode
 *
 * @param {string} mode - Execution mode
 * @returns {typeof BaseExecutor} Executor class
 */
export function getExecutorClass(mode) {
  switch (mode) {
    case ExecutionMode.DOCKER:
      return DockerExecutor;
    case ExecutionMode.NATIVE:
      return NativeExecutor;
    case ExecutionMode.SSH:
      return SSHExecutor;
    default:
      throw new Error(`Unknown execution mode: "${mode}"`);
  }
}

// Export executor classes for direct use if needed
export { BaseExecutor } from './base-executor.js';
export { DockerExecutor } from './docker-executor.js';
export { NativeExecutor } from './native-executor.js';
export { SSHExecutor } from './ssh-executor.js';
