import fs from 'fs';
import path from 'path';
import { loadEnvVars } from '../../lib/utils.js';

/**
 * Base Database Provider - Abstract interface for database operations
 *
 * All database providers (MySQL, PostgreSQL, SQLite) inherit from this class
 * and implement the required methods.
 */
export class BaseDatabaseProvider {
  constructor(config, fullConfig, executor) {
    if (new.target === BaseDatabaseProvider) {
      throw new Error('BaseDatabaseProvider is abstract and cannot be instantiated directly');
    }

    this.config = config;
    this.fullConfig = fullConfig;
    this.executor = executor;

    // Credential handling
    this.credentialSource = config.credentialSource || 'env';
    this.envMapping = config.envMapping || {};
    this.credentials = config.credentials || {};

    // Backup configuration
    this.backupConfig = config.backup || {};
  }

  /**
   * Get database credentials based on configuration
   *
   * @returns {Object} Credentials object with host, port, database, username, password
   */
  getCredentials() {
    if (this.credentialSource === 'config') {
      return { ...this.credentials };
    }

    // Load from environment
    const envFile = this.fullConfig.paths?.envFile;
    const env = envFile && fs.existsSync(envFile)
      ? loadEnvVars(envFile)
      : process.env;

    return {
      host: env[this.envMapping.host] || this.getDefaultHost(),
      port: parseInt(env[this.envMapping.port] || this.getDefaultPort(), 10),
      database: env[this.envMapping.database] || '',
      username: env[this.envMapping.username] || '',
      password: env[this.envMapping.password] || '',
    };
  }

  /**
   * Get the CLI command for this database
   *
   * @returns {string} CLI command name (e.g., 'mysql', 'psql', 'sqlite3')
   */
  getCLICommand() {
    throw new Error('getCLICommand() must be implemented by subclass');
  }

  /**
   * Get default host for this database type
   *
   * @returns {string}
   */
  getDefaultHost() {
    return 'localhost';
  }

  /**
   * Get default port for this database type
   *
   * @returns {number}
   */
  getDefaultPort() {
    throw new Error('getDefaultPort() must be implemented by subclass');
  }

  /**
   * Get CLI arguments for connecting to the database
   *
   * @returns {string[]} Array of CLI arguments
   */
  getCLIArgs() {
    throw new Error('getCLIArgs() must be implemented by subclass');
  }

  /**
   * Connect to database CLI interactively
   *
   * @param {Object} options - Connection options
   * @returns {Promise<void>}
   */
  async connect(options = {}) {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Execute a SQL query
   *
   * @param {string} sql - SQL query to execute
   * @param {Object} options - Query options
   * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
   */
  async query(sql, options = {}) {
    throw new Error('query() must be implemented by subclass');
  }

  /**
   * Backup the database to a file
   *
   * @param {string} destination - Backup file path (optional, uses config default)
   * @param {Object} options - Backup options
   * @returns {Promise<string>} Path to backup file
   */
  async backup(destination = null, options = {}) {
    throw new Error('backup() must be implemented by subclass');
  }

  /**
   * Restore database from a backup file
   *
   * @param {string} source - Backup file path
   * @param {Object} options - Restore options
   * @returns {Promise<void>}
   */
  async restore(source, options = {}) {
    throw new Error('restore() must be implemented by subclass');
  }

  /**
   * Create a quick snapshot of the database
   *
   * @param {string} name - Snapshot name (optional)
   * @returns {Promise<string>} Path to snapshot file
   */
  async snapshot(name = null) {
    throw new Error('snapshot() must be implemented by subclass');
  }

  /**
   * Rollback to the latest snapshot
   *
   * @returns {Promise<void>}
   */
  async rollback() {
    throw new Error('rollback() must be implemented by subclass');
  }

  /**
   * Get database size information
   *
   * @returns {Promise<{size: number, formatted: string, tables: Object[]}>}
   */
  async getSize() {
    throw new Error('getSize() must be implemented by subclass');
  }

  /**
   * Get the backup directory path
   *
   * @returns {string}
   */
  getBackupPath() {
    const backupPath = this.backupConfig.path || './backups/database';
    const projectRoot = this.fullConfig.paths?.projectRoot || process.cwd();

    return path.isAbsolute(backupPath)
      ? backupPath
      : path.join(projectRoot, backupPath);
  }

  /**
   * Get the snapshot directory path
   *
   * @returns {string}
   */
  getSnapshotPath() {
    const snapshotPath = this.fullConfig.storage?.filesystem?.snapshotPath || './snapshots';
    const projectRoot = this.fullConfig.paths?.projectRoot || process.cwd();

    return path.isAbsolute(snapshotPath)
      ? snapshotPath
      : path.join(projectRoot, snapshotPath);
  }

  /**
   * Ensure a directory exists
   *
   * @param {string} dirPath - Directory path
   */
  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate a timestamped filename for backups
   *
   * @param {string} prefix - Filename prefix
   * @param {string} extension - File extension
   * @returns {string}
   */
  generateFilename(prefix, extension) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}-${timestamp}.${extension}`;
  }

  /**
   * List available backup files
   *
   * @returns {Promise<Object[]>} Array of backup file info
   */
  async listBackups() {
    const backupDir = this.getBackupPath();

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    const backups = [];

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime,
        });
      }
    }

    // Sort by creation date, newest first
    return backups.sort((a, b) => b.created - a.created);
  }

  /**
   * List available snapshots
   *
   * @returns {Promise<Object[]>} Array of snapshot file info
   */
  async listSnapshots() {
    const snapshotDir = this.getSnapshotPath();

    if (!fs.existsSync(snapshotDir)) {
      return [];
    }

    const files = fs.readdirSync(snapshotDir);
    const snapshots = [];

    for (const file of files) {
      const filePath = path.join(snapshotDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        snapshots.push({
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime,
        });
      }
    }

    // Sort by creation date, newest first
    return snapshots.sort((a, b) => b.created - a.created);
  }
}
