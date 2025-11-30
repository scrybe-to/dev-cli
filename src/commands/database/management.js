/**
 * Database Management Commands
 *
 * Commands for managing database operations, backups, and connections
 */

import { execContainer } from '../../lib/docker.js';
import { status, colors } from '../../lib/output.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import Enquirer from 'enquirer';

/**
 * Get database credentials from environment
 */
function getDbCredentials(context) {
  const projectRoot = context.config?.paths?.projectRoot || process.cwd();
  const envPath = join(projectRoot, '.env');

  if (!existsSync(envPath)) {
    throw new Error('.env file not found');
  }

  const envContent = readFileSync(envPath, 'utf-8');
  const getEnvValue = (key, defaultValue = '') => {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].replace(/^["']|["']$/g, '') : defaultValue;
  };

  return {
    database: getEnvValue('DB_DATABASE', 'forge'),
    username: getEnvValue('DB_USERNAME', 'root'),
    password: getEnvValue('DB_PASSWORD', 'root'),
    host: getEnvValue('DB_HOST', 'localhost'),
  };
}

/**
 * Connect to MySQL CLI
 */
export const mysql = {
  name: 'mysql [args...]',
  category: 'Database Commands',
  description: 'Connect to MySQL CLI',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const { containers } = context;
    const credentials = getDbCredentials(context);

    status.info('Connecting to MySQL...');
    console.log('');

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];

    await execContainer(containers.database || containers.mysql, 'mysql', [
      '-u', credentials.username,
      `-p${credentials.password}`,
      credentials.database,
      ...commandArgs
    ]);
  }
};

/**
 * Connect to Redis CLI
 */
export const redis = {
  name: 'redis',
  category: 'Database Commands',
  description: 'Connect to Redis CLI',
  action: async (options, context) => {
    const { containers } = context;

    status.info('Connecting to Redis...');
    console.log('');

    await execContainer(containers.redis, 'redis-cli');
  }
};

/**
 * Backup database
 */
export const backup = {
  name: 'db:backup',
  category: 'Database Commands',
  description: 'Backup database to storage/backups',
  action: async (options, context) => {
    const { containers } = context;
    const credentials = getDbCredentials(context);
    const projectRoot = context.config?.paths?.projectRoot || process.cwd();

    status.info('Backing up database...');

    const backupsDir = join(projectRoot, 'storage', 'backups');
    if (!existsSync(backupsDir)) {
      mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
    const backupFile = join(backupsDir, `backup_${timestamp}.sql`);

    try {
      // Create write stream
      const stream = createWriteStream(backupFile);

      // Execute mysqldump and pipe to file
      const { execa } = await import('execa');
      const subprocess = execa('docker', [
        'exec',
        containers.database || containers.mysql,
        'mysqldump',
        '-u', credentials.username,
        `-p${credentials.password}`,
        credentials.database
      ], {
        stdout: 'pipe'
      });

      subprocess.stdout.pipe(stream);
      await subprocess;

      status.success(`Database backed up to ${backupFile}`);
    } catch (error) {
      status.error('Backup failed');
      throw error;
    }
  }
};

/**
 * Restore database from backup
 */
export const restore = {
  name: 'db:restore [file]',
  category: 'Database Commands',
  description: 'Restore database from backup',
  action: async (options, context, file) => {
    const { containers } = context;
    const credentials = getDbCredentials(context);
    const projectRoot = context.config?.paths?.projectRoot || process.cwd();

    let selectedFile = file;

    // If no file specified, show interactive selection
    if (!selectedFile) {
      const backupsDir = join(projectRoot, 'storage', 'backups');
      const snapshotsDir = join(projectRoot, 'storage', 'snapshots');
      const allFiles = [];

      // Collect regular backups
      if (existsSync(backupsDir)) {
        const backupFiles = readdirSync(backupsDir)
          .filter(f => f.endsWith('.sql'))
          .map(f => ({
            name: f,
            path: join('storage', 'backups', f),
            fullPath: join(backupsDir, f),
            type: 'backup',
            stats: statSync(join(backupsDir, f))
          }));
        allFiles.push(...backupFiles);
      }

      // Collect snapshots
      if (existsSync(snapshotsDir)) {
        const snapshotFiles = readdirSync(snapshotsDir)
          .filter(f => f.endsWith('.sql'))
          .map(f => ({
            name: f,
            path: join('storage', 'snapshots', f),
            fullPath: join(snapshotsDir, f),
            type: 'snapshot',
            stats: statSync(join(snapshotsDir, f))
          }));
        allFiles.push(...snapshotFiles);
      }

      if (allFiles.length === 0) {
        status.error('No backup files found');
        console.log('');
        console.log(colors.dim('Create backups with: db:backup or db:snapshot'));
        console.log('');
        return;
      }

      // Sort all files by date (newest first)
      allFiles.sort((a, b) => b.stats.mtime - a.stats.mtime);

      console.log(colors.blue('Select a backup to restore:'));
      console.log('');

      // Create choices for the select prompt
      const choices = allFiles.map(file => {
        const size = (file.stats.size / 1024 / 1024).toFixed(2) + ' MB';
        const date = file.stats.mtime.toLocaleString();
        const typeLabel = file.type === 'snapshot' ? colors.cyan('[SNAPSHOT]') : colors.magenta('[BACKUP]');

        return {
          name: `${typeLabel} ${file.name} ${colors.dim(`(${size}, ${date})`)}`,
          value: file.path,
          hint: file.path
        };
      });

      // Add cancel option
      choices.push({
        name: colors.yellow('Cancel'),
        value: null
      });

      const response = await Enquirer.prompt({
        type: 'select',
        name: 'backup',
        message: 'Choose backup file',
        choices: choices,
        result(value) {
          // Return the raw value, not the display name
          return this.focused.value;
        }
      });

      if (!response.backup) {
        console.log(colors.yellow('Operation cancelled.'));
        return;
      }

      selectedFile = response.backup;
      console.log('');
    }

    const backupFile = join(projectRoot, selectedFile);

    if (!existsSync(backupFile)) {
      status.error(`Backup file not found: ${backupFile}`);
      return;
    }

    // Confirm before restoring
    const confirmResponse = await Enquirer.prompt({
      type: 'confirm',
      name: 'confirmed',
      message: 'This will overwrite the current database. Are you sure?',
      initial: false
    });

    if (!confirmResponse.confirmed) {
      console.log(colors.yellow('Operation cancelled.'));
      return;
    }

    status.info(`Restoring database from ${backupFile}...`);

    try {
      // Create read stream
      const stream = createReadStream(backupFile);

      // Execute mysql and pipe from file
      const { execa } = await import('execa');
      const subprocess = execa('docker', [
        'exec',
        '-i',
        containers.database || containers.mysql,
        'mysql',
        '-u', credentials.username,
        `-p${credentials.password}`,
        credentials.database
      ], {
        stdin: 'pipe'
      });

      stream.pipe(subprocess.stdin);
      await subprocess;

      status.success('Database restored');
    } catch (error) {
      status.error('Restore failed');
      throw error;
    }
  }
};

/**
 * Create quick database snapshot
 */
export const snapshot = {
  name: 'db:snapshot',
  category: 'Database Commands',
  description: 'Create quick database snapshot',
  action: async (options, context) => {
    const { containers } = context;
    const credentials = getDbCredentials(context);
    const projectRoot = context.config?.paths?.projectRoot || process.cwd();

    status.info('Creating quick database snapshot...');

    const snapshotsDir = join(projectRoot, 'storage', 'snapshots');
    if (!existsSync(snapshotsDir)) {
      mkdirSync(snapshotsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
    const snapshotFile = join(snapshotsDir, `snapshot_${timestamp}.sql`);

    try {
      // Create write stream
      const stream = createWriteStream(snapshotFile);

      // Execute mysqldump with single-transaction for faster snapshots
      const { execa } = await import('execa');
      const subprocess = execa('docker', [
        'exec',
        containers.database || containers.mysql,
        'mysqldump',
        '-u', credentials.username,
        `-p${credentials.password}`,
        '--single-transaction',
        credentials.database
      ], {
        stdout: 'pipe'
      });

      subprocess.stdout.pipe(stream);
      await subprocess;

      // Save as latest snapshot
      writeFileSync(join(snapshotsDir, '.latest'), snapshotFile);

      status.success(`Snapshot saved: ${snapshotFile}`);
    } catch (error) {
      status.error('Snapshot failed');
      throw error;
    }
  }
};

/**
 * Rollback to latest snapshot
 */
export const rollback = {
  name: 'db:rollback',
  category: 'Database Commands',
  description: 'Rollback to latest snapshot',
  action: async (options, context) => {
    const { containers } = context;
    const credentials = getDbCredentials(context);
    const projectRoot = context.config?.paths?.projectRoot || process.cwd();

    const latestFile = join(projectRoot, 'storage', 'snapshots', '.latest');

    if (!existsSync(latestFile)) {
      status.error('No snapshots found');
      console.log('');
      console.log(colors.dim('Create one with: db:snapshot'));
      console.log('');
      return;
    }

    const snapshotFile = readFileSync(latestFile, 'utf-8').trim();

    if (!existsSync(snapshotFile)) {
      status.error(`Latest snapshot file not found: ${snapshotFile}`);
      return;
    }

    // Confirm before rolling back
    const confirmResponse = await Enquirer.prompt({
      type: 'confirm',
      name: 'confirmed',
      message: `This will restore the database to snapshot: ${snapshotFile}. Continue?`,
      initial: false
    });

    if (!confirmResponse.confirmed) {
      console.log(colors.yellow('Operation cancelled.'));
      return;
    }

    status.info(`Rolling back to ${snapshotFile}...`);

    try {
      // Create read stream
      const stream = createReadStream(snapshotFile);

      // Execute mysql and pipe from file
      const { execa } = await import('execa');
      const subprocess = execa('docker', [
        'exec',
        '-i',
        containers.database || containers.mysql,
        'mysql',
        '-u', credentials.username,
        `-p${credentials.password}`,
        credentials.database
      ], {
        stdin: 'pipe'
      });

      stream.pipe(subprocess.stdin);
      await subprocess;

      status.success('Database rolled back');
    } catch (error) {
      status.error('Rollback failed');
      throw error;
    }
  }
};

/**
 * Show database size
 */
export const dbSize = {
  name: 'db:size',
  category: 'Database Commands',
  description: 'Show database size',
  action: async (options, context) => {
    const { containers } = context;
    const credentials = getDbCredentials(context);

    const query = `SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size_MB' FROM information_schema.tables WHERE table_schema = '${credentials.database}' GROUP BY table_schema;`;

    try {
      // Use batch mode with no column names for easy parsing
      const { execa } = await import('execa');
      const { stdout } = await execa('docker', [
        'exec',
        containers.database || containers.mysql,
        'mysql',
        '-u', credentials.username,
        `-p${credentials.password}`,
        '-B', '-N', '-e', query
      ], { stdio: 'pipe' });

      const line = stdout.trim().split('\n')[0] || '';

      if (!line) {
        status.warning('Could not determine database size');
        return;
      }

      const [db, sizeStr] = line.split('\t');
      const size = parseFloat(sizeStr);

      // Build a pretty table
      const Table = (await import('cli-table3')).default;
      const table = new Table({
        head: [colors.cyan('Database'), colors.cyan('Size (MB)')],
        style: { head: [], border: [] }
      });

      table.push([
        colors.bold(db),
        colors.bold(isNaN(size) ? sizeStr : size.toFixed(2))
      ]);

      console.log('');
      console.log(table.toString());
      console.log('');
    } catch (error) {
      status.error('Failed to get database size');
      throw error;
    }
  }
};

// Export all commands
export default [
  mysql,
  redis,
  backup,
  restore,
  snapshot,
  rollback,
  dbSize,
];
