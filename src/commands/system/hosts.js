/**
 * System Hosts Commands
 *
 * Commands for managing /etc/hosts entries.
 * Uses the hosts provider pattern for platform-agnostic operations.
 */

import { status, colors } from '../../lib/output.js';

/**
 * Add host entries to /etc/hosts
 */
export const hosts = {
  name: 'hosts',
  category: 'System',
  description: 'Add host entries to /etc/hosts',
  action: async (options, context) => {
    const provider = context.getHostsProvider();

    if (!provider) {
      status.error('Hosts management is not configured');
      console.log('');
      console.log(colors.dim('Configure hosts in cli.config.js:'));
      console.log(colors.dim('  hosts: { driver: "etc-hosts", entries: ["myapp.test"] }'));
      console.log('');
      return;
    }

    const entries = provider.getConfiguredEntries();
    const ip = provider.getConfiguredIP();

    if (entries.length === 0) {
      status.warning('No host entries configured');
      console.log('');
      console.log(colors.dim('Add entries in cli.config.js:'));
      console.log(colors.dim('  hosts: { entries: ["myapp.test", "api.myapp.test"] }'));
      console.log('');
      return;
    }

    status.info('Adding host entries to /etc/hosts...');

    try {
      // Check which entries need to be added
      const checkResult = await provider.checkEntries(entries);

      if (checkResult.missing.length === 0) {
        status.success('All host entries already configured');
        return;
      }

      console.log('');
      console.log('The following entries will be added to /etc/hosts:');
      checkResult.missing.forEach(host => {
        console.log(`  ${colors.cyan(ip)} ${host}`);
      });
      console.log('');
      console.log(colors.yellow('This may require sudo access.'));
      console.log('');

      // Add the entries
      const result = await provider.addEntries(entries, ip);

      console.log('');
      if (result.added.length > 0) {
        status.success(`Added ${result.added.length} host entries`);
      }
      if (result.skipped.length > 0) {
        console.log(colors.dim(`Skipped ${result.skipped.length} existing entries`));
      }
    } catch (error) {
      status.error('Failed to add host entries');
      console.log('');
      console.log('You can manually add these entries to /etc/hosts:');
      entries.forEach(host => {
        console.log(`  ${ip} ${host}`);
      });
      console.log('');
      throw error;
    }
  }
};

/**
 * Check host configuration
 */
export const hostsCheck = {
  name: 'hosts:check',
  category: 'System',
  description: 'Check host configuration',
  action: async (options, context) => {
    const provider = context.getHostsProvider();

    if (!provider) {
      status.error('Hosts management is not configured');
      return;
    }

    const entries = provider.getConfiguredEntries();

    if (entries.length === 0) {
      status.warning('No host entries configured');
      return;
    }

    status.info('Checking host configuration...');
    console.log('');

    try {
      const result = await provider.checkEntries(entries);

      if (result.missing.length === 0) {
        status.success('All hosts are configured');
        console.log('');
        result.present.forEach(host => {
          console.log(`  ${colors.green('✓')} ${host}`);
        });
      } else {
        status.warning('Some hosts are missing');
        console.log('');

        if (result.present.length > 0) {
          console.log(colors.bold('Configured:'));
          result.present.forEach(host => {
            console.log(`  ${colors.green('✓')} ${host}`);
          });
          console.log('');
        }

        console.log(colors.bold('Missing:'));
        result.missing.forEach(host => {
          console.log(`  ${colors.red('✗')} ${host}`);
        });
        console.log('');
        console.log(`Run ${colors.cyan('hosts')} to add missing entries`);
      }
      console.log('');
    } catch (error) {
      status.error('Failed to check host configuration');
      throw error;
    }
  }
};

/**
 * Remove host entries
 */
export const hostsRemove = {
  name: 'hosts:remove',
  category: 'System',
  description: 'Remove host entries from /etc/hosts',
  action: async (options, context) => {
    const provider = context.getHostsProvider();

    if (!provider) {
      status.error('Hosts management is not configured');
      return;
    }

    const entries = provider.getConfiguredEntries();

    if (entries.length === 0) {
      status.warning('No host entries configured');
      return;
    }

    status.info('Removing host entries from /etc/hosts...');

    try {
      console.log('');
      console.log('The following entries will be removed from /etc/hosts:');
      entries.forEach(host => {
        console.log(`  ${host}`);
      });
      console.log('');
      console.log(colors.yellow('This may require sudo access.'));
      console.log('');

      const result = await provider.removeEntries(entries);

      console.log('');
      if (result.removed.length > 0) {
        status.success(`Removed ${result.removed.length} host entries`);
      }
      if (result.notFound.length > 0) {
        console.log(colors.dim(`${result.notFound.length} entries were not found`));
      }
    } catch (error) {
      status.error('Failed to remove host entries');
      throw error;
    }
  }
};

/**
 * List managed host entries
 */
export const hostsList = {
  name: 'hosts:list',
  category: 'System',
  description: 'List managed host entries',
  action: async (options, context) => {
    const provider = context.getHostsProvider();

    if (!provider) {
      status.error('Hosts management is not configured');
      return;
    }

    try {
      const entries = await provider.listEntries();

      if (entries.length === 0) {
        status.info('No managed host entries found');
        return;
      }

      console.log('');
      console.log(colors.bold('Managed host entries:'));
      console.log('');

      for (const entry of entries) {
        console.log(`  ${colors.cyan(entry.ip)} ${entry.hostname}`);
      }

      console.log('');
    } catch (error) {
      status.error('Failed to list host entries');
      throw error;
    }
  }
};

// Export all commands
export default [
  hosts,
  hostsCheck,
  hostsRemove,
  hostsList,
];
