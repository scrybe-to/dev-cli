/**
 * System Maintenance Commands
 *
 * Commands for system maintenance, diagnostics, and cleanup
 */

import { execContainer } from '../../lib/docker.js';
import { status, colors } from '../../lib/output.js';
import { execa } from 'execa';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Show Docker resource usage
 */
export const resources = {
  name: 'resources',
  category: 'System',
  description: 'Show Docker resource usage',
  action: async (options, context) => {
    status.info('Docker resource usage...');
    console.log('');

    try {
      // Get container stats
      const { stdout } = await execa('docker', [
        'stats', '--no-stream', '--format',
        'table {{.Container}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'
      ], { stdio: 'pipe' });

      console.log(stdout);

      // Show container count
      const { stdout: psOutput } = await execa('docker', ['ps', '-q'], { stdio: 'pipe' });
      const count = psOutput.trim().split('\n').filter(id => id).length;

      console.log('');
      console.log(`${colors.cyan('Running containers:')} ${colors.bold(count)}`);

      // Show disk usage
      console.log('');
      console.log(colors.bold('Docker Disk Usage:'));
      const { stdout: diskUsage } = await execa('docker', ['system', 'df'], { stdio: 'pipe' });
      console.log(diskUsage);
    } catch (error) {
      status.error('Failed to get Docker status');
      throw error;
    }
  }
};

/**
 * Clean Docker resources
 */
export const clean = {
  name: 'clean',
  category: 'System',
  description: 'Clean Docker resources',
  options: [
    { flags: '--aggressive', description: 'Remove all stopped containers and unused images' }
  ],
  action: async (options, context) => {
    const aggressive = options.aggressive || false;

    if (aggressive) {
      status.warning('Aggressive cleanup will remove all stopped containers and unused images');
      console.log(colors.dim('Volumes will be preserved'));
      console.log('');
    } else {
      status.info('Safe cleanup - removing dangling images and build cache...');
    }

    try {
      if (aggressive) {
        // Remove stopped containers
        status.info('Removing stopped containers...');
        await execa('docker', ['container', 'prune', '-f'], { stdio: 'inherit' });

        // Remove unused images
        status.info('Removing unused images...');
        await execa('docker', ['image', 'prune', '-a', '-f'], { stdio: 'inherit' });

        // Clear build cache
        status.info('Clearing build cache...');
        await execa('docker', ['builder', 'prune', '-f'], { stdio: 'inherit' });
      } else {
        // Remove dangling images only
        status.info('Removing dangling images...');
        await execa('docker', ['image', 'prune', '-f'], { stdio: 'inherit' });

        // Clear build cache
        status.info('Clearing build cache...');
        await execa('docker', ['builder', 'prune', '-f'], { stdio: 'inherit' });
      }

      // Show disk usage after cleanup
      console.log('');
      status.info('Disk usage after cleanup:');
      await execa('docker', ['system', 'df'], { stdio: 'inherit' });

      console.log('');
      status.success('Cleanup completed');
    } catch (error) {
      status.error('Cleanup failed');
      throw error;
    }
  }
};

/**
 * Warm Laravel caches
 */
export const cacheWarm = {
  name: 'cache:warm',
  category: 'System',
  description: 'Warm Laravel caches',
  action: async (options, context) => {
    const { containers, framework } = context;

    // Only run for Laravel
    if (framework?.name !== 'laravel') {
      status.warning('This command is only available for Laravel projects');
      return;
    }

    status.info('Pre-warming application caches...');
    console.log('');

    const warmCommands = [
      ['config:cache', 'Configuration cache'],
      ['route:cache', 'Route cache'],
      ['view:cache', 'View cache'],
      ['event:cache', 'Event cache']
    ];

    for (const [command, description] of warmCommands) {
      console.log(`  Warming ${description}...`);
      try {
        await execContainer(containers.app, 'php', ['artisan', command], {
          stdio: 'pipe'
        });
        console.log(`  ${colors.green('✓')} ${description} warmed`);
      } catch (error) {
        console.log(`  ${colors.yellow('⚠')} Failed to warm ${description}`);
      }
    }

    console.log('');
    status.success('Caches warmed successfully');
  }
};

/**
 * Fix file permissions
 */
export const permissions = {
  name: 'permissions',
  category: 'System',
  description: 'Fix file permissions',
  action: async (options, context) => {
    const { containers, framework } = context;

    // Only run for Laravel (or frameworks with similar structure)
    if (framework?.name !== 'laravel') {
      status.warning('This command is configured for Laravel projects');
      console.log(colors.dim('You may need to adjust for your framework'));
      console.log('');
    }

    status.info('Fixing file permissions...');
    console.log('');

    try {
      // Fix storage permissions
      console.log('  Setting storage permissions...');
      await execContainer(containers.app, 'chmod', ['-R', '775', 'storage'], {
        stdio: 'pipe'
      });

      console.log('  Setting bootstrap/cache permissions...');
      await execContainer(containers.app, 'chmod', ['-R', '775', 'bootstrap/cache'], {
        stdio: 'pipe'
      });

      // Ensure www-data owns the files
      console.log('  Setting ownership...');
      await execContainer(containers.app, 'chown', ['-R', 'www-data:www-data', 'storage'], {
        stdio: 'pipe'
      });
      await execContainer(containers.app, 'chown', ['-R', 'www-data:www-data', 'bootstrap/cache'], {
        stdio: 'pipe'
      });

      console.log('');
      status.success('Permissions fixed');
    } catch (error) {
      status.error('Failed to fix permissions');
      throw error;
    }
  }
};

/**
 * Clear container logs
 */
export const logsClean = {
  name: 'logs:clean',
  category: 'System',
  description: 'Clear container logs',
  action: async (options, context) => {
    const { containers } = context;

    status.info('Clearing container logs...');
    console.log('');

    try {
      // Get all container IDs
      const { stdout } = await execa('docker', ['ps', '-aq'], { stdio: 'pipe' });
      const containerIds = stdout.trim().split('\n').filter(id => id);

      let cleared = 0;
      let failed = 0;

      for (const id of containerIds) {
        const logPath = `/var/lib/docker/containers/${id}/${id}-json.log`;
        try {
          await execa('sudo', ['truncate', '-s', '0', logPath], { stdio: 'pipe' });
          cleared++;
        } catch (error) {
          // Ignore errors for individual containers
          failed++;
        }
      }

      console.log(`  ${colors.green('✓')} Cleared ${cleared} container log(s)`);
      if (failed > 0) {
        console.log(`  ${colors.yellow('⚠')} Failed to clear ${failed} container log(s)`);
      }

      // Clear Laravel logs if available
      if (containers.app) {
        try {
          console.log('  Clearing Laravel logs...');
          await execContainer(containers.app, 'truncate', ['-s', '0', 'storage/logs/laravel.log'], {
            stdio: 'pipe'
          });
          console.log(`  ${colors.green('✓')} Laravel logs cleared`);
        } catch {
          // Ignore if Laravel logs don't exist
        }
      }

      console.log('');
      status.success('Container logs cleared');
    } catch (error) {
      status.warning('Some logs could not be cleared');
    }
  }
};

/**
 * Show application URLs
 */
export const serve = {
  name: 'serve',
  category: 'System',
  description: 'Show application URLs',
  action: async (options, context) => {
    const domain = context.config?.domain || 'app.test';
    const framework = context.config?.framework || 'custom';

    // Build URLs based on configuration
    const urls = [];

    // Main application URL
    urls.push({
      name: 'Application',
      url: `http://${domain}`
    });

    // Framework-specific URLs
    if (framework === 'laravel') {
      urls.push(
        { name: 'API', url: `http://api.${domain}` },
        { name: 'Admin', url: `http://admin.${domain}` }
      );
    }

    // Common service URLs
    const { containers } = context;
    if (containers.mail || containers.mailpit) {
      urls.push({ name: 'Mail', url: `http://mail.${domain}` });
    }
    if (containers.minio || containers.storage) {
      urls.push({ name: 'MinIO', url: `http://minio.${domain}` });
    }

    // Display URLs in a table
    const Table = (await import('cli-table3')).default;
    const table = new Table({
      head: [colors.cyan('Service'), colors.cyan('URL')],
      style: { head: [], border: [] }
    });

    urls.forEach(({ name, url }) => {
      table.push([name, colors.blue(url)]);
    });

    console.log('');
    console.log(colors.bold(colors.cyan('Application URLs:')));
    console.log('');
    console.log(table.toString());
    console.log('');
  }
};

/**
 * Run system diagnostics
 */
export const doctor = {
  name: 'doctor',
  category: 'System',
  description: 'Run system diagnostics',
  action: async (options, context) => {
    const projectRoot = context.config?.paths?.projectRoot || process.cwd();

    status.info('Running system diagnostics...');
    console.log('');

    const checks = [];

    // Check Docker
    try {
      await execa('docker', ['info'], { stdio: 'pipe' });
      checks.push({ name: 'Docker', status: 'ok', message: 'Running' });
    } catch (error) {
      checks.push({ name: 'Docker', status: 'error', message: 'Not running' });
    }

    // Check Docker Compose
    try {
      await execa('docker', ['compose', 'version'], { stdio: 'pipe' });
      checks.push({ name: 'Docker Compose', status: 'ok', message: 'Installed' });
    } catch (error) {
      checks.push({ name: 'Docker Compose', status: 'error', message: 'Not found' });
    }

    // Check containers
    try {
      const { stdout } = await execa('docker', ['ps', '-q'], { stdio: 'pipe' });
      const count = stdout.trim().split('\n').filter(id => id).length;
      if (count > 0) {
        checks.push({ name: 'Containers', status: 'ok', message: `${count} running` });
      } else {
        checks.push({ name: 'Containers', status: 'warning', message: 'None running' });
      }
    } catch (error) {
      checks.push({ name: 'Containers', status: 'error', message: 'Cannot check' });
    }

    // Check hosts file (if configured)
    const hostEntries = context.config?.hosts || [];
    if (hostEntries.length > 0) {
      try {
        const content = readFileSync('/etc/hosts', 'utf-8');
        const configured = hostEntries.filter(host => content.includes(host));
        if (configured.length === hostEntries.length) {
          checks.push({ name: 'Hosts File', status: 'ok', message: 'All configured' });
        } else {
          checks.push({ name: 'Hosts File', status: 'warning', message: `${configured.length}/${hostEntries.length} configured` });
        }
      } catch (error) {
        checks.push({ name: 'Hosts File', status: 'error', message: 'Cannot read' });
      }
    }

    // Check .env file
    const envPath = join(projectRoot, '.env');
    if (existsSync(envPath)) {
      checks.push({ name: '.env File', status: 'ok', message: 'Found' });
    } else {
      checks.push({ name: '.env File', status: 'warning', message: 'Not found' });
    }

    // Check node_modules (if package.json exists)
    const packageJsonPath = join(projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      const nodeModulesPath = join(projectRoot, 'node_modules');
      if (existsSync(nodeModulesPath)) {
        checks.push({ name: 'Node Modules', status: 'ok', message: 'Installed' });
      } else {
        checks.push({ name: 'Node Modules', status: 'warning', message: 'Not installed' });
      }
    }

    // Check vendor (if composer.json exists for Laravel/PHP)
    if (context.framework?.name === 'laravel') {
      const vendorPath = join(projectRoot, 'vendor');
      if (existsSync(vendorPath)) {
        checks.push({ name: 'Composer Vendor', status: 'ok', message: 'Installed' });
      } else {
        checks.push({ name: 'Composer Vendor', status: 'warning', message: 'Not installed' });
      }
    }

    // Display results
    const Table = (await import('cli-table3')).default;
    const table = new Table({
      head: [colors.cyan('Check'), colors.cyan('Status'), colors.cyan('Details')],
      style: { head: [], border: [] },
      colWidths: [20, 10, 40]
    });

    checks.forEach(check => {
      const statusIcon = check.status === 'ok' ? colors.green('✓') :
                         check.status === 'warning' ? colors.yellow('⚠') :
                         colors.red('✗');
      table.push([check.name, statusIcon, check.message]);
    });

    console.log(table.toString());

    // Show recommendations
    const hasIssues = checks.some(c => c.status !== 'ok');
    if (hasIssues) {
      console.log('');
      console.log(colors.bold('Recommendations:'));
      console.log('');

      if (checks.find(c => c.name === 'Docker' && c.status !== 'ok')) {
        console.log(`  • Start Docker Desktop or Docker daemon`);
      }
      if (checks.find(c => c.name === 'Containers' && c.status !== 'ok')) {
        console.log(`  • Run ${colors.cyan('up')} to start containers`);
      }
      if (checks.find(c => c.name === 'Hosts File' && c.status !== 'ok')) {
        console.log(`  • Run ${colors.cyan('hosts')} to configure hosts`);
      }
      if (checks.find(c => c.name === '.env File' && c.status !== 'ok')) {
        console.log(`  • Copy ${colors.cyan('.env.example')} to ${colors.cyan('.env')}`);
      }
      if (checks.find(c => c.name === 'Node Modules' && c.status !== 'ok')) {
        console.log(`  • Run ${colors.cyan('npm install')} or ${colors.cyan('yarn install')}`);
      }
      if (checks.find(c => c.name === 'Composer Vendor' && c.status !== 'ok')) {
        console.log(`  • Run ${colors.cyan('composer install')}`);
      }
      console.log('');
    } else {
      console.log('');
      status.success('All systems operational!');
    }
  }
};

// Export all commands
export default [
  resources,
  clean,
  cacheWarm,
  permissions,
  logsClean,
  serve,
  doctor,
];
