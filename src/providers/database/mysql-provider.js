import path from 'path';
import { BaseDatabaseProvider } from './base-provider.js';

/**
 * MySQL Database Provider
 *
 * Provides MySQL-specific database operations including backup, restore,
 * snapshot, and interactive CLI access.
 */
export class MySQLProvider extends BaseDatabaseProvider {
  constructor(config, fullConfig, executor) {
    super(config, fullConfig, executor);
  }

  /**
   * Get the MySQL CLI command
   */
  getCLICommand() {
    return 'mysql';
  }

  /**
   * Get default MySQL port
   */
  getDefaultPort() {
    return 3306;
  }

  /**
   * Get MySQL CLI connection arguments
   */
  getCLIArgs() {
    const creds = this.getCredentials();
    const args = [];

    if (creds.host) {
      args.push('-h', creds.host);
    }

    if (creds.port) {
      args.push('-P', String(creds.port));
    }

    if (creds.username) {
      args.push('-u', creds.username);
    }

    if (creds.password) {
      args.push(`-p${creds.password}`);
    }

    if (creds.database) {
      args.push(creds.database);
    }

    return args;
  }

  /**
   * Connect to MySQL CLI interactively
   */
  async connect(options = {}) {
    const service = options.service || 'database';
    const args = this.getCLIArgs();

    return this.executor.runInService(service, 'mysql', args, {
      interactive: true,
      ...options,
    });
  }

  /**
   * Execute a SQL query
   */
  async query(sql, options = {}) {
    const service = options.service || 'database';
    const args = [...this.getCLIArgs(), '-e', sql];

    return this.executor.runInService(service, 'mysql', args, {
      stdio: 'pipe',
      ...options,
    });
  }

  /**
   * Backup the database using mysqldump
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

    // Build mysqldump arguments
    const dumpArgs = [];

    if (creds.host) {
      dumpArgs.push('-h', creds.host);
    }

    if (creds.port) {
      dumpArgs.push('-P', String(creds.port));
    }

    if (creds.username) {
      dumpArgs.push('-u', creds.username);
    }

    if (creds.password) {
      dumpArgs.push(`-p${creds.password}`);
    }

    // Add common options
    dumpArgs.push('--single-transaction', '--routines', '--triggers');

    if (options.noData) {
      dumpArgs.push('--no-data');
    }

    dumpArgs.push(creds.database);

    const service = options.service || 'database';

    // Execute mysqldump and capture output
    const result = await this.executor.runInService(service, 'mysqldump', dumpArgs, {
      stdio: 'pipe',
    });

    if (result.exitCode !== 0) {
      throw new Error(`Backup failed: ${result.stderr}`);
    }

    // Write to file (we need to handle this differently based on executor)
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

    const args = this.getCLIArgs();
    const service = options.service || 'database';

    // Read the SQL file
    const sql = fs.readFileSync(source, 'utf-8');

    // Execute the restore
    return this.executor.runInService(service, 'mysql', args, {
      input: sql,
      stdio: 'pipe',
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

    const sql = `
      SELECT
        table_name AS 'table',
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb'
      FROM information_schema.tables
      WHERE table_schema = '${creds.database}'
      ORDER BY (data_length + index_length) DESC;
    `;

    const result = await this.query(sql);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to get database size: ${result.stderr}`);
    }

    // Parse the output
    const lines = result.stdout.trim().split('\n');
    const tables = [];
    let totalSize = 0;

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const [tableName, sizeMb] = lines[i].split('\t');
      const size = parseFloat(sizeMb) || 0;
      tables.push({ table: tableName, sizeMb: size });
      totalSize += size;
    }

    return {
      database: creds.database,
      size: totalSize * 1024 * 1024, // Convert to bytes
      formatted: `${totalSize.toFixed(2)} MB`,
      tables,
    };
  }
}
