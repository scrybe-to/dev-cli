import fs from 'fs';
import { loadEnvVars } from '../lib/utils.js';
import { createExecutor } from '../execution/index.js';
import { createDatabaseProvider, registerDatabaseProviders } from '../providers/database/index.js';
import { createStorageProvider, registerStorageProviders } from '../providers/storage/index.js';
import { createHostsProvider, registerHostsProviders } from '../providers/hosts/index.js';
import { getRegistry } from './provider-registry.js';

/**
 * Context class - Contains configuration, execution context, and providers
 *
 * This class holds all the state needed by commands and provides access to
 * the execution context and providers for database, storage, and hosts.
 *
 * Philosophy: Context = "What is the state?" + "How do I execute?"
 */
export class Context {
  constructor(config, options = {}) {
    this._config = config;
    this._options = options;
    this._env = null;
    this._executor = null;
    this._providers = {};
    this._providersInitialized = false;
  }

  /**
   * Get CLI configuration
   */
  get config() {
    return this._config;
  }

  /**
   * Get container name mappings (for Docker mode)
   */
  get containers() {
    return { ...(this._config.execution?.docker?.containers || {}) };
  }

  /**
   * Get path configuration
   */
  get paths() {
    return { ...this._config.paths };
  }

  /**
   * Get host entries configuration
   */
  get hosts() {
    return { ...this._config.hosts };
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
   * Get execution mode
   */
  get executionMode() {
    return this._config.execution?.mode || 'docker';
  }

  /**
   * Get plugin configuration
   */
  get plugins() {
    return { ...this._config.plugins };
  }

  /**
   * Get command configuration
   */
  get commands() {
    return { ...this._config.commands };
  }

  /**
   * Get the executor for this context
   *
   * @returns {BaseExecutor} The executor instance
   */
  getExecutor() {
    if (!this._executor) {
      this._executor = createExecutor(this._config);
    }
    return this._executor;
  }

  /**
   * Initialize providers (call once during setup)
   */
  initializeProviders() {
    if (this._providersInitialized) {
      return;
    }

    // Register all provider types with the global registry
    const registry = getRegistry();
    registerDatabaseProviders(registry);
    registerStorageProviders(registry);
    registerHostsProviders(registry);

    this._providersInitialized = true;
  }

  /**
   * Get a provider by type
   *
   * @param {string} type - Provider type ('database', 'storage', 'hosts')
   * @returns {BaseProvider|null} The provider instance or null if not configured
   */
  getProvider(type) {
    // Ensure providers are registered
    this.initializeProviders();

    // Check for cached provider
    if (this._providers[type] !== undefined) {
      return this._providers[type];
    }

    const executor = this.getExecutor();

    switch (type) {
      case 'database':
        this._providers[type] = createDatabaseProvider(
          this._config.database,
          this._config,
          executor
        );
        break;

      case 'storage':
        this._providers[type] = createStorageProvider(
          this._config.storage,
          this._config,
          executor
        );
        break;

      case 'hosts':
        this._providers[type] = createHostsProvider(
          this._config.hosts,
          this._config,
          executor
        );
        break;

      default:
        throw new Error(`Unknown provider type: "${type}"`);
    }

    return this._providers[type];
  }

  /**
   * Get database provider
   *
   * @returns {BaseDatabaseProvider|null}
   */
  getDatabaseProvider() {
    return this.getProvider('database');
  }

  /**
   * Get storage provider
   *
   * @returns {BaseStorageProvider|null}
   */
  getStorageProvider() {
    return this.getProvider('storage');
  }

  /**
   * Get hosts provider
   *
   * @returns {BaseHostsProvider|null}
   */
  getHostsProvider() {
    return this.getProvider('hosts');
  }

  /**
   * Check if a file exists at the configured path
   */
  hasFile(pathKey) {
    const filePath = this.paths[pathKey];
    return filePath && fs.existsSync(filePath);
  }

  /**
   * Check if a provider is configured and available
   *
   * @param {string} type - Provider type
   * @returns {boolean}
   */
  hasProvider(type) {
    const config = this._config[type];

    if (!config) {
      return false;
    }

    const driver = config.driver;
    return driver && driver !== 'none';
  }

  /**
   * Get branding configuration
   */
  get branding() {
    return { ...this._config.branding };
  }

  /**
   * Get full configuration (for debugging)
   */
  toJSON() {
    return {
      name: this._config.name,
      version: this._config.version,
      executionMode: this.executionMode,
      containers: this.containers,
      paths: this.paths,
      hosts: this.hosts,
      runtime: this.runtime,
      plugins: this.plugins,
      commands: this.commands,
      providers: {
        database: this.hasProvider('database') ? this._config.database.driver : 'none',
        storage: this.hasProvider('storage') ? this._config.storage.driver : 'none',
        hosts: this.hasProvider('hosts') ? this._config.hosts.driver : 'none',
      },
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
