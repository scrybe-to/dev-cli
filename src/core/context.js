import fs from 'fs';
import { loadEnvVars } from '../lib/utils.js';

/**
 * Context class - Contains configuration and runtime state (DATA ONLY)
 *
 * This class holds all the data needed by commands but does NOT contain
 * any behavior/methods (except getters). All operations are in separate
 * utility modules that are imported.
 *
 * Philosophy: Context = "What is the state?" not "What can I do?"
 */
export class Context {
  constructor(config, options = {}) {
    this._config = config;
    this._options = options;
    this._env = null;
    this._dockerState = null;
  }

  /**
   * Get CLI configuration
   */
  get config() {
    return {
      name: this._config.name,
      version: this._config.version,
      description: this._config.description,
      framework: this._config.framework,
      branding: this._config.branding,
    };
  }

  /**
   * Get container name mappings
   */
  get containers() {
    return { ...this._config.containers };
  }

  /**
   * Get path configuration
   */
  get paths() {
    return { ...this._config.paths };
  }

  /**
   * Get host entries
   */
  get hosts() {
    return [...this._config.hosts];
  }

  /**
   * Get environment variables (lazy loaded)
   */
  get env() {
    if (!this._env) {
      this._env = loadEnvVars(this.paths.envFile);
    }
    return { ...this._env };
  }

  /**
   * Get runtime options
   */
  get runtime() {
    return {
      debug: this._options.debug || process.env.DEBUG === '1',
      verbose: this._options.verbose || false,
      dryRun: this._options.dryRun || false,
    };
  }

  /**
   * Get framework-specific configuration
   */
  get framework() {
    const framework = this._config.framework;
    return this._config[framework] || {};
  }

  /**
   * Get command configuration
   */
  get commands() {
    return { ...this._config.commands };
  }

  /**
   * Check if a file exists at the configured path
   */
  hasFile(pathKey) {
    const filePath = this.paths[pathKey];
    return filePath && fs.existsSync(filePath);
  }

  /**
   * Get full configuration (for debugging)
   */
  toJSON() {
    return {
      config: this.config,
      containers: this.containers,
      paths: this.paths,
      hosts: this.hosts,
      runtime: this.runtime,
      framework: this.framework,
      commands: this.commands,
    };
  }
}

/**
 * Create a context from configuration
 *
 * @param {Object} config - Validated configuration object
 * @param {Object} options - Runtime options
 * @returns {Context} Context instance
 */
export function createContext(config, options = {}) {
  return new Context(config, options);
}
