import { EtcHostsProvider } from './etc-hosts-provider.js';
import { getRegistry } from '../../core/provider-registry.js';

/**
 * Supported hosts drivers
 */
export const HostsDriver = {
  ETC_HOSTS: 'etc-hosts',
  NONE: 'none',
};

/**
 * Register all hosts providers with the global registry
 */
export function registerHostsProviders(registry = null) {
  const reg = registry || getRegistry();

  reg.register('hosts', HostsDriver.ETC_HOSTS, EtcHostsProvider);
}

/**
 * Create a hosts provider based on configuration
 *
 * @param {Object} config - Hosts configuration
 * @param {Object} fullConfig - Full CLI configuration
 * @param {Object} executor - Executor instance
 * @returns {BaseHostsProvider|null}
 */
export function createHostsProvider(config, fullConfig, executor) {
  const driver = config?.driver;

  if (!driver || driver === HostsDriver.NONE) {
    return null;
  }

  switch (driver) {
    case HostsDriver.ETC_HOSTS:
      return new EtcHostsProvider(config, fullConfig, executor);

    default:
      throw new Error(
        `Unknown hosts driver: "${driver}". ` +
        `Supported drivers: ${Object.values(HostsDriver).filter(d => d !== 'none').join(', ')}`
      );
  }
}

// Export provider classes for direct use
export { BaseHostsProvider } from './base-provider.js';
export { EtcHostsProvider } from './etc-hosts-provider.js';
