/**
 * Provider Registry - Central registry for all providers
 *
 * Manages database, storage, hosts, and other providers.
 * Provides a unified interface for resolving providers based on configuration.
 */
export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.instances = new Map();
  }

  /**
   * Register a provider class
   *
   * @param {string} type - Provider type (e.g., 'database', 'storage', 'hosts')
   * @param {string} name - Provider name (e.g., 'mysql', 'postgres', 'filesystem')
   * @param {typeof BaseProvider} providerClass - Provider class constructor
   */
  register(type, name, providerClass) {
    const key = `${type}:${name}`;
    this.providers.set(key, providerClass);
  }

  /**
   * Check if a provider is registered
   *
   * @param {string} type - Provider type
   * @param {string} name - Provider name
   * @returns {boolean}
   */
  has(type, name) {
    const key = `${type}:${name}`;
    return this.providers.has(key);
  }

  /**
   * Get a provider class (not instantiated)
   *
   * @param {string} type - Provider type
   * @param {string} name - Provider name
   * @returns {typeof BaseProvider|null}
   */
  get(type, name) {
    const key = `${type}:${name}`;
    return this.providers.get(key) || null;
  }

  /**
   * Resolve and instantiate a provider based on configuration
   *
   * @param {string} type - Provider type (e.g., 'database')
   * @param {Object} config - Full CLI configuration
   * @param {Object} executor - Executor instance for running commands
   * @returns {BaseProvider|null}
   */
  resolve(type, config, executor = null) {
    const typeConfig = config[type];

    if (!typeConfig) {
      return null;
    }

    const driver = typeConfig.driver;

    if (!driver || driver === 'none') {
      return null;
    }

    // Check for cached instance
    const instanceKey = `${type}:${driver}`;
    if (this.instances.has(instanceKey)) {
      return this.instances.get(instanceKey);
    }

    // Get provider class
    const ProviderClass = this.get(type, driver);

    if (!ProviderClass) {
      throw new Error(
        `Provider "${driver}" not found for type "${type}". ` +
        `Available providers: ${this.listProviders(type).join(', ') || 'none'}`
      );
    }

    // Instantiate provider
    const instance = new ProviderClass(typeConfig, config, executor);
    this.instances.set(instanceKey, instance);

    return instance;
  }

  /**
   * List all registered providers for a type
   *
   * @param {string} type - Provider type
   * @returns {string[]} Array of provider names
   */
  listProviders(type) {
    const prefix = `${type}:`;
    const providers = [];

    for (const key of this.providers.keys()) {
      if (key.startsWith(prefix)) {
        providers.push(key.slice(prefix.length));
      }
    }

    return providers;
  }

  /**
   * List all provider types
   *
   * @returns {string[]} Array of type names
   */
  listTypes() {
    const types = new Set();

    for (const key of this.providers.keys()) {
      const [type] = key.split(':');
      types.add(type);
    }

    return Array.from(types);
  }

  /**
   * Clear cached provider instances
   * Useful for testing or configuration changes
   */
  clearInstances() {
    this.instances.clear();
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.providers.clear();
    this.instances.clear();
  }
}

// Global singleton instance
let globalRegistry = null;

/**
 * Get the global provider registry
 *
 * @returns {ProviderRegistry}
 */
export function getRegistry() {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry();
  }
  return globalRegistry;
}

/**
 * Create a new provider registry
 * Useful for testing or isolated contexts
 *
 * @returns {ProviderRegistry}
 */
export function createRegistry() {
  return new ProviderRegistry();
}

/**
 * Reset the global registry
 * Primarily for testing
 */
export function resetRegistry() {
  if (globalRegistry) {
    globalRegistry.clear();
  }
  globalRegistry = null;
}
