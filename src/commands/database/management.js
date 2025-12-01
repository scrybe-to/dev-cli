/**
 * Database Management Commands
 *
 * Commands for managing database operations, backups, and connections.
 * Uses the database provider pattern for database-agnostic operations.
 */

import { status, colors } from '../../lib/output.js';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import Enquirer from 'enquirer';

/**
 * Connect to database CLI
 */
export const dbConnect = {
  name: 'db [args...]',
  category: 'Database Commands',
  description: 'Connect to database CLI',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const provider = context.getDatabaseProvider();

    if (!provider) {
      status.error('Database is not configured');
      console.log('');
      console.log(colors.dim('Configure database in cli.config.js:'));
      console.log(colors.dim('  database: { driver: "mysql", ... }'));
      console.log('');
      return;
    }

    const driverName = context.config.database?.driver || 'database';
    status.info(`Connecting to ${driverName}...`);
    console.log('');

    await provider.connect({ service: 'database' });
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
    const executor = context.getExecutor();

    status.info('Connecting to Redis...');
    console.log('');

    await executor.runInService('cache', 'redis-cli', [], {
      interactive: true,
    });
  }
};

/**
 * Backup database
 */
export const backup = {
  name: 'db:backup',
  category: 'Database Commands',
  description: 'Backup database',
  action: async (options, context) => {
    const provider = context.getDatabaseProvider();

    if (!provider) {
      status.error('Database is not configured');
      console.log('');
      console.log(colors.dim('Configure database in cli.config.js:'));
      console.log(colors.dim('  database: { driver: "mysql", ... }'));
      console.log('');
      return;
    }

    status.info('Backing up database...');

    try {
      const backupPath = await provider.backup(null, { service: 'database' });
      status.success(`Database backed up to ${backupPath}`);
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
    const provider = context.getDatabaseProvider();

    if (!provider) {
      status.error('Database is not configured');
      return;
    }

    let selectedFile = file;

    // If no file specified, show interactive selection
    if (!selectedFile) {
      const backups = await provider.listBackups();
      const snapshots = await provider.listSnapshots();

      const allFiles = [
        ...backups.map(b => ({ ...b, type: 'backup' })),
        ...snapshots.map(s => ({ ...s, type: 'snapshot' })),
      ];

      if (allFiles.length === 0) {
        status.error('No backup files found');
        console.log('');
        console.log(colors.dim('Create backups with: db:backup or db:snapshot'));
        console.log('');
        return;
      }

      // Sort by date (newest first)
      allFiles.sort((a, b) => new Date(b.created) - new Date(a.created));

      console.log(colors.blue('Select a backup to restore:'));
      console.log('');

      const choices = allFiles.map(f => {
        const size = (f.size / 1024 / 1024).toFixed(2) + ' MB';
        const date = new Date(f.created).toLocaleString();
        const typeLabel = f.type === 'snapshot'
          ? colors.cyan('[SNAPSHOT]')
          : colors.magenta('[BACKUP]');

        return {
          name: `${typeLabel} ${f.name} ${colors.dim(`(${size}, ${date})`)}`,
          value: f.path,
        };
      });

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

    if (!existsSync(selectedFile)) {
      status.error(`Backup file not found: ${selectedFile}`);
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

    status.info(`Restoring database from ${selectedFile}...`);

    try {
      await provider.restore(selectedFile, { service: 'database' });
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
    const provider = context.getDatabaseProvider();

    if (!provider) {
      status.error('Database is not configured');
      return;
    }

    status.info('Creating quick database snapshot...');

    try {
      const snapshotPath = await provider.snapshot();
      status.success(`Snapshot saved: ${snapshotPath}`);
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
    const provider = context.getDatabaseProvider();

    if (!provider) {
      status.error('Database is not configured');
      return;
    }

    const snapshots = await provider.listSnapshots();

    if (snapshots.length === 0) {
      status.error('No snapshots found');
      console.log('');
      console.log(colors.dim('Create one with: db:snapshot'));
      console.log('');
      return;
    }

    const latest = snapshots[0];

    // Confirm before rolling back
    const confirmResponse = await Enquirer.prompt({
      type: 'confirm',
      name: 'confirmed',
      message: `This will restore the database to snapshot: ${latest.name}. Continue?`,
      initial: false
    });

    if (!confirmResponse.confirmed) {
      console.log(colors.yellow('Operation cancelled.'));
      return;
    }

    status.info(`Rolling back to ${latest.name}...`);

    try {
      await provider.rollback();
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
    const provider = context.getDatabaseProvider();

    if (!provider) {
      status.error('Database is not configured');
      return;
    }

    try {
      const sizeInfo = await provider.getSize();

      // Build a pretty table
      const Table = (await import('cli-table3')).default;
      const table = new Table({
        head: [colors.cyan('Database'), colors.cyan('Size')],
        style: { head: [], border: [] }
      });

      table.push([
        colors.bold(sizeInfo.database),
        colors.bold(sizeInfo.formatted)
      ]);

      console.log('');
      console.log(table.toString());
      console.log('');

      // Show table sizes if available
      if (sizeInfo.tables && sizeInfo.tables.length > 0) {
        const tableTable = new Table({
          head: [colors.cyan('Table'), colors.cyan('Size (MB)')],
          style: { head: [], border: [] }
        });

        for (const t of sizeInfo.tables.slice(0, 10)) {
          tableTable.push([
            t.table,
            t.sizeMb !== null ? t.sizeMb.toFixed(2) : 'N/A'
          ]);
        }

        if (sizeInfo.tables.length > 10) {
          tableTable.push([
            colors.dim(`... and ${sizeInfo.tables.length - 10} more`),
            ''
          ]);
        }

        console.log(colors.blue('Table Sizes:'));
        console.log(tableTable.toString());
        console.log('');
      }
    } catch (error) {
      status.error('Failed to get database size');
      throw error;
    }
  }
};

/**
 * List database backups
 */
export const listBackups = {
  name: 'db:list',
  category: 'Database Commands',
  description: 'List available database backups',
  action: async (options, context) => {
    const provider = context.getDatabaseProvider();

    if (!provider) {
      status.error('Database is not configured');
      return;
    }

    const backups = await provider.listBackups();
    const snapshots = await provider.listSnapshots();

    if (backups.length === 0 && snapshots.length === 0) {
      status.info('No backups or snapshots found');
      console.log('');
      console.log(colors.dim('Create backups with: db:backup'));
      console.log(colors.dim('Create snapshots with: db:snapshot'));
      console.log('');
      return;
    }

    const Table = (await import('cli-table3')).default;

    if (backups.length > 0) {
      console.log('');
      console.log(colors.blue('Backups:'));
      const table = new Table({
        head: [colors.cyan('Name'), colors.cyan('Size'), colors.cyan('Created')],
        style: { head: [], border: [] }
      });

      for (const b of backups) {
        table.push([
          b.name,
          (b.size / 1024 / 1024).toFixed(2) + ' MB',
          new Date(b.created).toLocaleString()
        ]);
      }

      console.log(table.toString());
    }

    if (snapshots.length > 0) {
      console.log('');
      console.log(colors.blue('Snapshots:'));
      const table = new Table({
        head: [colors.cyan('Name'), colors.cyan('Size'), colors.cyan('Created')],
        style: { head: [], border: [] }
      });

      for (const s of snapshots) {
        table.push([
          s.name,
          (s.size / 1024 / 1024).toFixed(2) + ' MB',
          new Date(s.created).toLocaleString()
        ]);
      }

      console.log(table.toString());
    }

    console.log('');
  }
};

// Export all commands
export default [
  dbConnect,
  redis,
  backup,
  restore,
  snapshot,
  rollback,
  dbSize,
  listBackups,
];
