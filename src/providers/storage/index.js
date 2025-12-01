import { FilesystemProvider } from './filesystem-provider.js';
import { S3Provider } from './s3-provider.js';
import { getRegistry } from '../../core/provider-registry.js';

/**
 * Supported storage drivers
 */
export const StorageDriver = {
  FILESYSTEM: 'filesystem',
  S3: 's3',
  MINIO: 'minio', // Alias for s3
  NONE: 'none',
};

/**
 * Register all storage providers with the global registry
 */
export function registerStorageProviders(registry = null) {
  const reg = registry || getRegistry();

  reg.register('storage', StorageDriver.FILESYSTEM, FilesystemProvider);
  reg.register('storage', StorageDriver.S3, S3Provider);
  reg.register('storage', StorageDriver.MINIO, S3Provider); // MinIO uses S3 protocol
}

/**
 * Create a storage provider based on configuration
 *
 * @param {Object} config - Storage configuration
 * @param {Object} fullConfig - Full CLI configuration
 * @param {Object} executor - Executor instance
 * @returns {BaseStorageProvider|null}
 */
export function createStorageProvider(config, fullConfig, executor) {
  const driver = config?.driver;

  if (!driver || driver === StorageDriver.NONE) {
    return null;
  }

  switch (driver) {
    case StorageDriver.FILESYSTEM:
      return new FilesystemProvider(config, fullConfig, executor);

    case StorageDriver.S3:
    case StorageDriver.MINIO:
      return new S3Provider(config, fullConfig, executor);

    default:
      throw new Error(
        `Unknown storage driver: "${driver}". ` +
        `Supported drivers: ${Object.values(StorageDriver).filter(d => d !== 'none').join(', ')}`
      );
  }
}

// Export provider classes for direct use
export { BaseStorageProvider } from './base-provider.js';
export { FilesystemProvider } from './filesystem-provider.js';
export { S3Provider } from './s3-provider.js';
