import path from 'path';
import fs from 'fs';
import { BaseDatabaseProvider } from './base-provider.js';

/**
 * SQLite Database Provider
 *
 * Provides SQLite-specific database operations including backup, restore,
 * snapshot, and interactive CLI access.
 */
export class SQLiteProvider extends BaseDatabaseProvider {
  constructor(config, fullConfig, executor) {
    super(config, fullConfig, executor);

    // SQLite uses a database file path instead of connection credentials
    this.databasePath = config.credentials?.database || config.databasePath || '';
  }

  /**
   * Get the SQLite CLI command
   */
  getCLICommand() {
    return 'sqlite3';
  }

  /**
   * Get default port - not applicable for SQLite
   */
  getDefaultPort() {
    return 0; // Not applicable
  }

  /**
   * Get the database file path
   */
  getDatabasePath() {
    if (!this.databasePath) {
      throw new Error('SQLite database path not configured');
    }

    const projectRoot = this.fullConfig.paths?.projectRoot || process.cwd();

    return path.isAbsolute(this.databasePath)
      ? this.databasePath
      : path.join(projectRoot, this.databasePath);
  }

  /**
   * Override getCredentials for SQLite
   */
  getCredentials() {
    return {
      database: this.getDatabasePath(),
      host: null,
      port: null,
      username: null,
      password: null,
    };
  }

  /**
   * Get SQLite CLI arguments
   */
  getCLIArgs() {
    return [this.getDatabasePath()];
  }

  /**
   * Connect to SQLite CLI interactively
   */
  async connect(options = {}) {
    const dbPath = this.getDatabasePath();

    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file not found: ${dbPath}`);
    }

    // SQLite is typically used with native execution
    return this.executor.run('sqlite3', [dbPath], {
      interactive: true,
      ...options,
    });
  }

  /**
   * Execute a SQL query
   */
  async query(sql, options = {}) {
    const dbPath = this.getDatabasePath();

    return this.executor.run('sqlite3', [dbPath, sql], {
      stdio: 'pipe',
      ...options,
    });
  }

  /**
   * Backup the database (simple file copy for SQLite)
   */
  async backup(destination = null, options = {}) {
    const dbPath = this.getDatabasePath();

    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file not found: ${dbPath}`);
    }

    // Ensure backup directory exists
    const backupDir = this.getBackupPath();
    this.ensureDirectory(backupDir);

    // Generate backup filename
    const dbName = path.basename(dbPath, path.extname(dbPath));
    const filename = destination || this.generateFilename(dbName, 'db');
    const backupPath = path.isAbsolute(filename)
      ? filename
      : path.join(backupDir, filename);

    // Use SQLite's backup command for consistency
    const result = await this.executor.run('sqlite3', [
      dbPath,
      `.backup '${backupPath}'`
    ], {
      stdio: 'pipe',
    });

    if (result.exitCode !== 0) {
      // Fallback to file copy
      fs.copyFileSync(dbPath, backupPath);
    }

    return backupPath;
  }

  /**
   * Restore database from a backup file
   */
  async restore(source, options = {}) {
    if (!fs.existsSync(source)) {
      throw new Error(`Backup file not found: ${source}`);
    }

    const dbPath = this.getDatabasePath();

    // Use SQLite's restore command
    const result = await this.executor.run('sqlite3', [
      dbPath,
      `.restore '${source}'`
    ], {
      stdio: 'pipe',
    });

    if (result.exitCode !== 0) {
      // Fallback to file copy
      fs.copyFileSync(source, dbPath);
    }

    return result;
  }

  /**
   * Create a quick snapshot
   */
  async snapshot(name = null) {
    const snapshotDir = this.getSnapshotPath();
    this.ensureDirectory(snapshotDir);

    const dbPath = this.getDatabasePath();
    const dbName = path.basename(dbPath, path.extname(dbPath));
    const filename = name || `snapshot-${Date.now()}.db`;
    const snapshotPath = path.join(snapshotDir, filename);

    await this.backup(snapshotPath);

    return snapshotPath;
  }

  /**
   * Rollback to the latest snapshot
   */
  async rollback() {
    const snapshots = await this.listSnapshots();

    if (snapshots.length === 0) {
      throw new Error('No snapshots available');
    }

    const latest = snapshots[0];
    await this.restore(latest.path);
  }

  /**
   * Get database size information
   */
  async getSize() {
    const dbPath = this.getDatabasePath();

    if (!fs.existsSync(dbPath)) {
      throw new Error(`Database file not found: ${dbPath}`);
    }

    const stats = fs.statSync(dbPath);
    const totalSize = stats.size;

    // Query for table sizes
    const tablesSql = `
      SELECT name,
             (SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()) as size
      FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `;

    const result = await this.query(tablesSql);
    const tables = [];

    if (result.exitCode === 0 && result.stdout) {
      const lines = result.stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length >= 1) {
          tables.push({
            table: parts[0],
            sizeMb: null, // SQLite doesn't easily expose per-table sizes
          });
        }
      }
    }

    return {
      database: dbPath,
      size: totalSize,
      formatted: this.formatBytes(totalSize),
      tables,
    };
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Vacuum the database to reclaim space
   */
  async vacuum() {
    return this.query('VACUUM;');
  }

  /**
   * Check database integrity
   */
  async checkIntegrity() {
    const result = await this.query('PRAGMA integrity_check;');

    return {
      ok: result.stdout?.trim() === 'ok',
      result: result.stdout,
    };
  }
}
