/**
 * Core Docker Compose Commands
 */

import { compose, getRunningContainers, getContainerStats } from '../../lib/docker.js';
import { status, colors } from '../../lib/output.js';

/**
 * Start all containers
 */
export const up = {
  name: 'up',
  category: 'Container Management',
  description: 'Start all containers',
  options: [
    { flags: '--build', description: 'Build containers before starting' }
  ],
  action: async (options, context) => {
    const { paths } = context;
    const args = ['up', '-d'];

    if (options.build) {
      args.push('--build');
    }

    status.info('Starting containers...');

    await compose(paths.composeFile, paths.envFile, args);

    status.success('Containers started');
  }
};

/**
 * Stop all containers
 */
export const down = {
  name: 'down',
  category: 'Container Management',
  description: 'Stop all containers',
  allowUnknownOption: true,
  action: async (options, context) => {
    const { paths } = context;

    status.info('Stopping containers...');

    await compose(paths.composeFile, paths.envFile, ['down']);

    status.success('Containers stopped');
  }
};

/**
 * Restart all containers
 */
export const restart = {
  name: 'restart',
  category: 'Container Management',
  description: 'Restart all containers',
  action: async (options, context) => {
    const { paths } = context;

    status.info('Restarting containers...');

    await compose(paths.composeFile, paths.envFile, ['restart']);

    status.success('Containers restarted');
  }
};

/**
 * Show container status
 */
export const ps = {
  name: 'ps',
  category: 'Container Management',
  aliases: ['status'],
  description: 'Show container status',
  action: async (options, context) => {
    const { paths } = context;

    await compose(paths.composeFile, paths.envFile, ['ps']);
  }
};

/**
 * Show container logs
 */
export const logs = {
  name: 'logs [services...]',
  category: 'Container Management',
  description: 'Show container logs',
  options: [
    { flags: '-f, --follow', description: 'Follow log output' },
    { flags: '--tail <lines>', description: 'Number of lines to show from the end' }
  ],
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const { paths } = context;
    const args = ['logs'];

    if (options.follow) {
      args.push('-f');
    }

    if (options.tail) {
      args.push('--tail', options.tail);
    }

    // Commander passes variadic args as a single array argument
    const services = Array.isArray(variadicArgs) ? variadicArgs : [];
    args.push(...services);

    await compose(paths.composeFile, paths.envFile, args);
  }
};

/**
 * Build containers
 */
export const build = {
  name: 'build [services...]',
  category: 'Container Management',
  description: 'Build containers',
  options: [
    { flags: '--no-cache', description: 'Build without cache' }
  ],
  action: async (options, context, variadicArgs) => {
    const { paths } = context;
    const args = ['build'];

    if (options.noCache) {
      args.push('--no-cache');
    }

    // Commander passes variadic args as a single array argument
    const services = Array.isArray(variadicArgs) ? variadicArgs : [];
    args.push(...services);

    status.info('Building containers...');

    await compose(paths.composeFile, paths.envFile, args);

    status.success('Build completed');
  }
};

/**
 * Show container resource usage
 */
export const stats = {
  name: 'stats',
  category: 'Container Management',
  description: 'Show container resource usage',
  action: async (options, context) => {
    const { containers } = context;

    status.info('Container resource usage...');
    console.log('');

    const containerNames = Object.values(containers);
    const runningContainers = await getRunningContainers(containerNames.join('|'));

    if (runningContainers.length === 0) {
      status.warning('No containers running');
      return;
    }

    const stats = await getContainerStats(runningContainers);
    console.log(stats);
  }
};

/**
 * Reload application containers (for .env changes)
 */
export const reload = {
  name: 'reload',
  category: 'Container Management',
  description: 'Reload app containers for .env changes',
  action: async (options, context) => {
    const { containers } = context;

    status.info('Reloading application containers (for .env changes)...');
    console.log('');

    // Containers to reload - default to common ones
    const containersToReload = [
      containers.app,
      containers.horizon,
      containers.scheduler,
      containers.queue,
      containers.worker
    ].filter(Boolean); // Remove undefined containers

    try {
      const { execa } = await import('execa');

      // Restart containers in parallel for better performance
      const promises = containersToReload.map(async (container) => {
        console.log(`  ${colors.magenta('↻')} Restarting ${container}...`);
        try {
          await execa('docker', ['restart', container], { stdio: 'pipe' });
          console.log(`  ${colors.green('✓')} ${container} restarted`);
          return true;
        } catch (error) {
          console.log(`  ${colors.red('✗')} Failed to restart ${container}`);
          return false;
        }
      });

      const results = await Promise.all(promises);
      const failed = results.filter(result => !result).length;

      console.log('');
      if (failed === 0) {
        status.success('Application containers reloaded');
        status.info('Environment variables have been refreshed');
      } else {
        status.warning('Some containers failed to restart - check status with ps command');
      }
    } catch (error) {
      status.error('Failed to reload containers');
      throw error;
    }
  }
};

/**
 * Full rebuild (down, build, up)
 */
export const rebuild = {
  name: 'rebuild [services...]',
  category: 'Container Management',
  description: 'Full rebuild (down, build, up)',
  options: [
    { flags: '--no-cache', description: 'Build without cache' }
  ],
  action: async (options, context, variadicArgs) => {
    const { paths } = context;

    status.info('Rebuilding containers...');
    console.log('');

    try {
      // Stop containers
      status.info('Stopping containers...');
      await compose(paths.composeFile, paths.envFile, ['down']);

      // Build
      const buildArgs = ['build'];
      if (options.noCache) {
        buildArgs.push('--no-cache');
      }

      // Add service names if provided
      const services = Array.isArray(variadicArgs) ? variadicArgs : [];
      buildArgs.push(...services);

      status.info('Building containers...');
      await compose(paths.composeFile, paths.envFile, buildArgs);

      // Start
      status.info('Starting containers...');
      await compose(paths.composeFile, paths.envFile, ['up', '-d']);

      console.log('');
      status.success('Containers rebuilt and started');
    } catch (error) {
      status.error('Rebuild failed');
      throw error;
    }
  }
};

/**
 * Open bash shell in container
 */
export const bash = {
  name: 'bash [container]',
  category: 'Container Management',
  description: 'Open bash shell in container (default: app)',
  action: async (options, context, container) => {
    const { containers } = context;

    // Default to app container if no container specified
    // If container name is provided, look it up in containers map first
    let targetContainer;
    if (container) {
      // Check if it's a service name that maps to a container
      targetContainer = containers[container] || container;
    } else {
      targetContainer = containers.app;
    }

    if (!targetContainer) {
      status.error('No container specified and no default app container configured');
      return;
    }

    status.info(`Opening bash shell in ${targetContainer} container...`);
    console.log('');

    try {
      const { execa } = await import('execa');

      // Use docker exec with interactive TTY
      await execa('docker', ['exec', '-it', targetContainer, 'bash'], {
        stdio: 'inherit'
      });
    } catch (error) {
      // Check if container is running
      try {
        const { execa } = await import('execa');
        const { stdout } = await execa('docker', ['ps', '--filter', `name=${targetContainer}`, '--format', '{{.Names}}'], {
          stdio: 'pipe'
        });

        if (!stdout.includes(targetContainer)) {
          status.error(`Container '${targetContainer}' is not running`);
          console.log('');
          console.log(colors.dim('Start containers with: up'));
        } else {
          status.error(`Failed to open bash shell in '${targetContainer}'`);
        }
      } catch {
        status.error('Failed to connect to container');
      }
      throw error;
    }
  }
};

// Export all commands
export default [
  up,
  down,
  restart,
  ps,
  logs,
  build,
  stats,
  reload,
  rebuild,
  bash,
];
