/**
 * Base Hosts Provider - Abstract interface for host file management
 *
 * All hosts providers inherit from this class and implement
 * the required methods for managing system host entries.
 */
export class BaseHostsProvider {
  constructor(config, fullConfig, executor) {
    if (new.target === BaseHostsProvider) {
      throw new Error('BaseHostsProvider is abstract and cannot be instantiated directly');
    }

    this.config = config;
    this.fullConfig = fullConfig;
    this.executor = executor;

    // Host entries from configuration
    this.entries = config.entries || [];
    this.ip = config.ip || '127.0.0.1';
  }

  /**
   * Get provider name
   *
   * @returns {string}
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  /**
   * Get the path to the hosts file
   *
   * @returns {string}
   */
  getHostsFilePath() {
    throw new Error('getHostsFilePath() must be implemented by subclass');
  }

  /**
   * Check if hosts management is available
   * (e.g., we have write permission to the hosts file)
   *
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('isAvailable() must be implemented by subclass');
  }

  /**
   * Add host entries to the hosts file
   *
   * @param {string[]} hosts - Array of hostnames to add
   * @param {string} ip - IP address to map to (defaults to config ip)
   * @returns {Promise<{added: string[], skipped: string[]}>}
   */
  async addEntries(hosts = null, ip = null) {
    throw new Error('addEntries() must be implemented by subclass');
  }

  /**
   * Remove host entries from the hosts file
   *
   * @param {string[]} hosts - Array of hostnames to remove
   * @returns {Promise<{removed: string[], notFound: string[]}>}
   */
  async removeEntries(hosts) {
    throw new Error('removeEntries() must be implemented by subclass');
  }

  /**
   * Check which configured hosts are present in the hosts file
   *
   * @param {string[]} hosts - Array of hostnames to check (defaults to config entries)
   * @returns {Promise<{present: string[], missing: string[]}>}
   */
  async checkEntries(hosts = null) {
    throw new Error('checkEntries() must be implemented by subclass');
  }

  /**
   * List all custom entries in the hosts file
   * (entries that were added by this tool)
   *
   * @returns {Promise<Object[]>} Array of {ip, hostname} objects
   */
  async listEntries() {
    throw new Error('listEntries() must be implemented by subclass');
  }

  /**
   * Get the configured host entries
   *
   * @returns {string[]}
   */
  getConfiguredEntries() {
    return [...this.entries];
  }

  /**
   * Get the configured IP address
   *
   * @returns {string}
   */
  getConfiguredIP() {
    return this.ip;
  }

  /**
   * Validate a hostname format
   *
   * @param {string} hostname
   * @returns {boolean}
   */
  isValidHostname(hostname) {
    // Basic hostname validation
    const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    return pattern.test(hostname) && hostname.length <= 253;
  }

  /**
   * Validate an IP address format
   *
   * @param {string} ip
   * @returns {boolean}
   */
  isValidIP(ip) {
    // IPv4 validation
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Pattern.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }

    // IPv6 validation (simplified)
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$/;
    return ipv6Pattern.test(ip);
  }
}
