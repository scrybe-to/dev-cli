import path from 'path';
import fs from 'fs';

/**
 * Plugin Manager - Discovers, loads, and manages CLI plugins
 *
 * Plugins provide additional commands and configuration for specific frameworks
 * or use cases (e.g., Laravel, Rails, Django).
 */
export class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.pluginsDir = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../plugins'
    );
  }

  /**
   * Load a plugin by name
   *
   * @param {string} name - Plugin name (e.g., 'laravel', 'rails')
   * @returns {Promise<Object>} Plugin manifest
   */
  async loadPlugin(name) {
    // Check if already loaded
    if (this.plugins.has(name)) {
      return this.plugins.get(name);
    }

    const pluginPath = path.join(this.pluginsDir, name, 'index.js');

    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin "${name}" not found at ${pluginPath}`);
    }

    try {
      const { default: plugin } = await import(pluginPath);

      // Validate plugin structure
      this.validatePlugin(plugin, name);

      // Store the plugin
      this.plugins.set(name, plugin);

      return plugin;
    } catch (error) {
      if (error.message.includes('not found')) {
        throw error;
      }
      throw new Error(`Failed to load plugin "${name}": ${error.message}`);
    }
  }

  /**
   * Load multiple plugins
   *
   * @param {string[]} names - Array of plugin names
   * @returns {Promise<Object[]>} Array of plugin manifests
   */
  async loadPlugins(names) {
    const results = [];

    for (const name of names) {
      try {
        const plugin = await this.loadPlugin(name);
        results.push(plugin);
      } catch (error) {
        // Log warning but continue loading other plugins
        console.warn(`Warning: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Validate plugin structure
   *
   * @param {Object} plugin - Plugin manifest
   * @param {string} name - Plugin name (for error messages)
   */
  validatePlugin(plugin, name) {
    if (!plugin) {
      throw new Error(`Plugin "${name}" does not export a default object`);
    }

    if (!plugin.name) {
      throw new Error(`Plugin "${name}" must have a "name" property`);
    }

    if (!plugin.version) {
      throw new Error(`Plugin "${name}" must have a "version" property`);
    }
  }

  /**
   * Get a loaded plugin
   *
   * @param {string} name - Plugin name
   * @returns {Object|null} Plugin manifest or null if not loaded
   */
  getPlugin(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * Check if a plugin is loaded
   *
   * @param {string} name - Plugin name
   * @returns {boolean}
   */
  hasPlugin(name) {
    return this.plugins.has(name);
  }

  /**
   * Get commands from a plugin
   *
   * @param {string} name - Plugin name
   * @returns {Promise<Object[]>} Array of command definitions
   */
  async getCommands(name) {
    const plugin = this.getPlugin(name);

    if (!plugin) {
      throw new Error(`Plugin "${name}" is not loaded`);
    }

    if (!plugin.commands) {
      return [];
    }

    // Commands can be an array or a function that returns a promise
    if (typeof plugin.commands === 'function') {
      const module = await plugin.commands();
      return module.default || module;
    }

    return plugin.commands;
  }

  /**
   * Get configuration schema from a plugin
   *
   * @param {string} name - Plugin name
   * @returns {Object|null} Joi schema or null
   */
  getConfigSchema(name) {
    const plugin = this.getPlugin(name);

    if (!plugin) {
      return null;
    }

    return plugin.configSchema || null;
  }

  /**
   * Get lifecycle hooks from a plugin
   *
   * @param {string} name - Plugin name
   * @returns {Object} Hooks object
   */
  getHooks(name) {
    const plugin = this.getPlugin(name);

    if (!plugin || !plugin.hooks) {
      return {};
    }

    return plugin.hooks;
  }

  /**
   * Run a hook across all loaded plugins
   *
   * @param {string} hookName - Hook name (e.g., 'beforeCommand', 'afterCommand')
   * @param {Object} context - Context to pass to hooks
   * @param {...any} args - Additional arguments for the hook
   */
  async runHook(hookName, context, ...args) {
    for (const [name, plugin] of this.plugins) {
      if (plugin.hooks && typeof plugin.hooks[hookName] === 'function') {
        try {
          await plugin.hooks[hookName](context, ...args);
        } catch (error) {
          console.warn(`Warning: Hook "${hookName}" in plugin "${name}" failed: ${error.message}`);
        }
      }
    }
  }

  /**
   * Get all loaded plugins
   *
   * @returns {Object[]} Array of plugin manifests
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all loaded plugin names
   *
   * @returns {string[]}
   */
  getPluginNames() {
    return Array.from(this.plugins.keys());
  }

  /**
   * List available plugins (from the plugins directory)
   *
   * @returns {Promise<string[]>} Array of available plugin names
   */
  async listAvailable() {
    if (!fs.existsSync(this.pluginsDir)) {
      return [];
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    const plugins = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const indexPath = path.join(this.pluginsDir, entry.name, 'index.js');
        if (fs.existsSync(indexPath)) {
          plugins.push(entry.name);
        }
      }
    }

    return plugins;
  }

  /**
   * Unload a plugin
   *
   * @param {string} name - Plugin name
   */
  unloadPlugin(name) {
    this.plugins.delete(name);
  }

  /**
   * Unload all plugins
   */
  unloadAll() {
    this.plugins.clear();
  }
}

// Global singleton instance
let globalManager = null;

/**
 * Get the global plugin manager
 *
 * @returns {PluginManager}
 */
export function getPluginManager() {
  if (!globalManager) {
    globalManager = new PluginManager();
  }
  return globalManager;
}

/**
 * Create a new plugin manager
 * Useful for testing or isolated contexts
 *
 * @returns {PluginManager}
 */
export function createPluginManager() {
  return new PluginManager();
}

/**
 * Reset the global plugin manager
 * Primarily for testing
 */
export function resetPluginManager() {
  if (globalManager) {
    globalManager.unloadAll();
  }
  globalManager = null;
}
