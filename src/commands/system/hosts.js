/**
 * System Hosts Commands
 *
 * Commands for managing /etc/hosts entries
 */

import { status, colors } from '../../lib/output.js';
import { readFileSync, existsSync } from 'fs';
import { execa } from 'execa';

/**
 * Get host entries from config
 */
function getHostEntries(context) {
  // Check if user has defined custom hosts in config
  const customHosts = context.config?.hosts || [];

  if (customHosts.length > 0) {
    return customHosts;
  }

  // Default hosts - can be customized based on framework
  const baseHost = context.config?.domain || 'app.test';

  return [
    baseHost,
    `api.${baseHost}`,
    `admin.${baseHost}`,
  ];
}

/**
 * Add host entries to /etc/hosts
 */
export const hosts = {
  name: 'hosts',
  category: 'System',
  description: 'Add host entries to /etc/hosts',
  action: async (options, context) => {
    const hostEntries = getHostEntries(context);

    status.info('Adding host entries to /etc/hosts...');

    const hostsFile = '/etc/hosts';

    try {
      // Check if entries already exist
      if (!existsSync(hostsFile)) {
        status.error('/etc/hosts file not found');
        return;
      }

      const content = readFileSync(hostsFile, 'utf-8');
      const missingHosts = hostEntries.filter(host => !content.includes(host));

      if (missingHosts.length === 0) {
        status.success('All host entries already configured');
        return;
      }

      console.log('');
      console.log('The following entries will be added to /etc/hosts:');
      missingHosts.forEach(host => {
        console.log(`  ${colors.cyan('127.0.0.1')} ${host}`);
      });
      console.log('');
      console.log(colors.yellow('This requires sudo access.'));
      console.log('');

      // Add missing entries
      const entriesToAdd = missingHosts.map(host => `127.0.0.1 ${host}`).join('\n');
      const projectName = context.config?.name || 'Development';

      await execa('sudo', ['sh', '-c', `echo "\n# ${projectName}\n${entriesToAdd}" >> ${hostsFile}`], {
        stdio: 'inherit'
      });

      console.log('');
      status.success('Host entries added successfully');
    } catch (error) {
      status.error('Failed to add host entries');
      console.log('');
      console.log('You can manually add these entries to /etc/hosts:');
      hostEntries.forEach(host => {
        console.log(`  127.0.0.1 ${host}`);
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
    const hostEntries = getHostEntries(context);

    status.info('Checking host configuration...');
    console.log('');

    try {
      const hostsFile = '/etc/hosts';

      if (!existsSync(hostsFile)) {
        status.error('/etc/hosts file not found');
        return;
      }

      const content = readFileSync(hostsFile, 'utf-8');
      const configured = [];
      const missing = [];

      hostEntries.forEach(host => {
        if (content.includes(host)) {
          configured.push(host);
        } else {
          missing.push(host);
        }
      });

      if (missing.length === 0) {
        status.success('All hosts are configured');
        console.log('');
        configured.forEach(host => {
          console.log(`  ${colors.green('✓')} ${host}`);
        });
      } else {
        status.warning('Some hosts are missing');
        console.log('');

        if (configured.length > 0) {
          console.log(colors.bold('Configured:'));
          configured.forEach(host => {
            console.log(`  ${colors.green('✓')} ${host}`);
          });
          console.log('');
        }

        console.log(colors.bold('Missing:'));
        missing.forEach(host => {
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
    const hostEntries = getHostEntries(context);

    status.info('Removing host entries from /etc/hosts...');

    try {
      console.log('');
      console.log('The following entries will be removed from /etc/hosts:');
      hostEntries.forEach(host => {
        console.log(`  ${host}`);
      });
      console.log('');
      console.log(colors.yellow('This requires sudo access.'));
      console.log('');

      // Create a pattern to match any of the hosts
      const pattern = hostEntries.map(host => host.replace(/\./g, '\\.')).join('\\|');

      // Use sed to remove lines containing any of the hosts
      await execa('sudo', ['sed', '-i', '', `/${pattern}/d`, '/etc/hosts'], {
        stdio: 'inherit'
      });

      console.log('');
      status.success('Host entries removed successfully');
    } catch (error) {
      status.error('Failed to remove host entries');
      throw error;
    }
  }
};

// Export all commands
export default [
  hosts,
  hostsCheck,
  hostsRemove,
];
