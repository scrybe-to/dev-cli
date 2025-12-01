import { MySQLProvider } from './mysql-provider.js';
import { PostgresProvider } from './postgres-provider.js';
import { SQLiteProvider } from './sqlite-provider.js';
import { getRegistry } from '../../core/provider-registry.js';

/**
 * Supported database drivers
 */
export const DatabaseDriver = {
  MYSQL: 'mysql',
  POSTGRES: 'postgres',
  POSTGRESQL: 'postgresql', // Alias
  SQLITE: 'sqlite',
  NONE: 'none',
};

/**
 * Register all database providers with the global registry
 */
export function registerDatabaseProviders(registry = null) {
  const reg = registry || getRegistry();

  reg.register('database', DatabaseDriver.MYSQL, MySQLProvider);
  reg.register('database', DatabaseDriver.POSTGRES, PostgresProvider);
  reg.register('database', DatabaseDriver.POSTGRESQL, PostgresProvider); // Alias
  reg.register('database', DatabaseDriver.SQLITE, SQLiteProvider);
}

/**
 * Create a database provider based on configuration
 *
 * @param {Object} config - Database configuration
 * @param {Object} fullConfig - Full CLI configuration
 * @param {Object} executor - Executor instance
 * @returns {BaseDatabaseProvider|null}
 */
export function createDatabaseProvider(config, fullConfig, executor) {
  const driver = config?.driver;

  if (!driver || driver === DatabaseDriver.NONE) {
    return null;
  }

  switch (driver) {
    case DatabaseDriver.MYSQL:
      return new MySQLProvider(config, fullConfig, executor);

    case DatabaseDriver.POSTGRES:
    case DatabaseDriver.POSTGRESQL:
      return new PostgresProvider(config, fullConfig, executor);

    case DatabaseDriver.SQLITE:
      return new SQLiteProvider(config, fullConfig, executor);

    default:
      throw new Error(
        `Unknown database driver: "${driver}". ` +
        `Supported drivers: ${Object.values(DatabaseDriver).filter(d => d !== 'none').join(', ')}`
      );
  }
}

/**
 * Get the default environment variable mapping for a database driver
 *
 * @param {string} driver - Database driver name
 * @returns {Object} Environment variable mapping
 */
export function getDefaultEnvMapping(driver) {
  // Common Laravel/Rails/Django style mapping
  const commonMapping = {
    host: 'DB_HOST',
    port: 'DB_PORT',
    database: 'DB_DATABASE',
    username: 'DB_USERNAME',
    password: 'DB_PASSWORD',
  };

  // PostgreSQL might use different env vars
  if (driver === DatabaseDriver.POSTGRES || driver === DatabaseDriver.POSTGRESQL) {
    return {
      host: 'DB_HOST',
      port: 'DB_PORT',
      database: 'DB_DATABASE',
      username: 'DB_USERNAME',
      password: 'DB_PASSWORD',
      // Also check PostgreSQL-specific vars
      // PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
    };
  }

  return commonMapping;
}

// Export provider classes for direct use
export { BaseDatabaseProvider } from './base-provider.js';
export { MySQLProvider } from './mysql-provider.js';
export { PostgresProvider } from './postgres-provider.js';
export { SQLiteProvider } from './sqlite-provider.js';
