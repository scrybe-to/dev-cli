import path from 'path';
import { BaseDatabaseProvider } from './base-provider.js';

/**
 * PostgreSQL Database Provider
 *
 * Provides PostgreSQL-specific database operations including backup, restore,
 * snapshot, and interactive CLI access.
 */
export class PostgresProvider extends BaseDatabaseProvider {
  constructor(config, fullConfig, executor) {
    super(config, fullConfig, executor);
  }

  /**
   * Get the PostgreSQL CLI command
   */
  getCLICommand() {
    return 'psql';
  }

  /**
   * Get default PostgreSQL port
   */
  getDefaultPort() {
    return 5432;
  }

  /**
   * Get PostgreSQL CLI connection arguments
   */
  getCLIArgs() {
    const creds = this.getCredentials();
    const args = [];

    if (creds.host) {
      args.push('-h', creds.host);
    }

    if (creds.port) {
      args.push('-p', String(creds.port));
    }

    if (creds.username) {
      args.push('-U', creds.username);
    }

    if (creds.database) {
      args.push('-d', creds.database);
    }

    return args;
  }

  /**
   * Get environment variables for PostgreSQL commands
   */
  getEnvVars() {
    const creds = this.getCredentials();
    const env = {};

    if (creds.password) {
      env.PGPASSWORD = creds.password;
    }

    return env;
  }

  /**
   * Connect to PostgreSQL CLI interactively
   */
  async connect(options = {}) {
    const service = options.service || 'database';
    const args = this.getCLIArgs();

    return this.executor.runInService(service, 'psql', args, {
      interactive: true,
      env: this.getEnvVars(),
      ...options,
    });
  }

  /**
   * Execute a SQL query
   */
  async query(sql, options = {}) {
    const service = options.service || 'database';
    const args = [...this.getCLIArgs(), '-c', sql];

    return this.executor.runInService(service, 'psql', args, {
      stdio: 'pipe',
      env: this.getEnvVars(),
      ...options,
    });
  }

  /**
   * Backup the database using pg_dump
   */
  async backup(destination = null, options = {}) {
    const creds = this.getCredentials();

    if (!creds.database) {
      throw new Error('Database name not configured');
    }

    // Ensure backup directory exists
    const backupDir = this.getBackupPath();
    this.ensureDirectory(backupDir);

    // Generate backup filename
    const filename = destination || this.generateFilename(creds.database, 'sql');
    const backupPath = path.isAbsolute(filename)
      ? filename
      : path.join(backupDir, filename);

    // Build pg_dump arguments
    const dumpArgs = [];

    if (creds.host) {
      dumpArgs.push('-h', creds.host);
    }

    if (creds.port) {
      dumpArgs.push('-p', String(creds.port));
    }

    if (creds.username) {
      dumpArgs.push('-U', creds.username);
    }

    // Add format options
    if (options.format === 'custom') {
      dumpArgs.push('-Fc');
    } else {
      dumpArgs.push('-Fp'); // Plain SQL format
    }

    if (options.noData) {
      dumpArgs.push('--schema-only');
    }

    dumpArgs.push(creds.database);

    const service = options.service || 'database';

    // Execute pg_dump and capture output
    const result = await this.executor.runInService(service, 'pg_dump', dumpArgs, {
      stdio: 'pipe',
      env: this.getEnvVars(),
    });

    if (result.exitCode !== 0) {
      throw new Error(`Backup failed: ${result.stderr}`);
    }

    // Write to file
    const fs = await import('fs');
    fs.writeFileSync(backupPath, result.stdout);

    return backupPath;
  }

  /**
   * Restore database from a backup file
   */
  async restore(source, options = {}) {
    const creds = this.getCredentials();

    if (!creds.database) {
      throw new Error('Database name not configured');
    }

    const fs = await import('fs');

    if (!fs.existsSync(source)) {
      throw new Error(`Backup file not found: ${source}`);
    }

    const service = options.service || 'database';

    // Check if it's a custom format backup
    if (source.endsWith('.dump') || options.format === 'custom') {
      // Use pg_restore for custom format
      const restoreArgs = [...this.getCLIArgs(), '-c', source];
      return this.executor.runInService(service, 'pg_restore', restoreArgs, {
        env: this.getEnvVars(),
        ...options,
      });
    }

    // For plain SQL, use psql
    const args = this.getCLIArgs();
    const sql = fs.readFileSync(source, 'utf-8');

    return this.executor.runInService(service, 'psql', args, {
      input: sql,
      stdio: 'pipe',
      env: this.getEnvVars(),
      ...options,
    });
  }

  /**
   * Create a quick snapshot
   */
  async snapshot(name = null) {
    const creds = this.getCredentials();
    const snapshotDir = this.getSnapshotPath();
    this.ensureDirectory(snapshotDir);

    const filename = name || `snapshot-${Date.now()}.sql`;
    const snapshotPath = path.join(snapshotDir, filename);

    await this.backup(snapshotPath, { service: 'database' });

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
    await this.restore(latest.path, { service: 'database' });
  }

  /**
   * Get database size information
   */
  async getSize() {
    const creds = this.getCredentials();

    if (!creds.database) {
      throw new Error('Database name not configured');
    }

    // Query for database size
    const dbSizeSql = `SELECT pg_database_size('${creds.database}') as size;`;
    const dbResult = await this.query(dbSizeSql);

    // Query for table sizes
    const tablesSql = `
      SELECT
        tablename as table,
        pg_total_relation_size(quote_ident(tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY size DESC;
    `;
    const tablesResult = await this.query(tablesSql);

    // Parse results
    let totalSize = 0;
    const tables = [];

    if (dbResult.exitCode === 0) {
      const sizeMatch = dbResult.stdout.match(/(\d+)/);
      if (sizeMatch) {
        totalSize = parseInt(sizeMatch[1], 10);
      }
    }

    if (tablesResult.exitCode === 0) {
      const lines = tablesResult.stdout.trim().split('\n');
      // Skip header lines (psql output has decorative lines)
      for (const line of lines) {
        const match = line.match(/^\s*(\w+)\s*\|\s*(\d+)/);
        if (match) {
          tables.push({
            table: match[1],
            sizeMb: parseInt(match[2], 10) / 1024 / 1024,
          });
        }
      }
    }

    return {
      database: creds.database,
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
}
