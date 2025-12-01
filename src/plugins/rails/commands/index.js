/**
 * Rails Framework Commands
 *
 * These commands are loaded when the Rails plugin is enabled.
 */

import { status, colors } from '../../../lib/output.js';

/**
 * Get Rails config from context
 */
function getRailsConfig(context) {
  return context.plugins?.config?.rails || {};
}

/**
 * Run Rails command
 */
export const rails = {
  name: 'rails [args...]',
  category: 'Rails Commands',
  aliases: ['r'],
  description: 'Run Rails command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const railsConfig = getRailsConfig(context);
    const railsPath = railsConfig.railsPath || 'rails';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', railsPath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Run Bundle command
 */
export const bundle = {
  name: 'bundle [args...]',
  category: 'Rails Commands',
  aliases: ['b'],
  description: 'Run Bundler command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const railsConfig = getRailsConfig(context);
    const bundlerPath = railsConfig.bundlerPath || 'bundle';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', bundlerPath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Run Rake tasks
 */
export const rake = {
  name: 'rake [args...]',
  category: 'Rails Commands',
  description: 'Run Rake task',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const railsConfig = getRailsConfig(context);
    const rakePath = railsConfig.rakePath || 'rake';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', rakePath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Open Rails console
 */
export const console_cmd = {
  name: 'console',
  category: 'Rails Commands',
  aliases: ['c'],
  description: 'Open Rails console',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Opening Rails console...');
    console.log(colors.dim('Use exit or Ctrl+D to quit'));
    console.log('');

    await executor.runInService('app', 'rails', ['console'], {
      interactive: true,
    });
  }
};

/**
 * Run tests
 */
export const test = {
  name: 'test [args...]',
  category: 'Rails Commands',
  description: 'Run tests',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    status.info('Running tests...');
    console.log('');

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'rails', ['test', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Run database migrations
 */
export const migrate = {
  name: 'migrate [args...]',
  category: 'Database Commands',
  aliases: ['m'],
  description: 'Run database migrations',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'rails', ['db:migrate', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Run database seeds
 */
export const seed = {
  name: 'seed',
  category: 'Database Commands',
  aliases: ['s'],
  description: 'Run database seeds',
  action: async (options, context) => {
    const executor = context.getExecutor();

    await executor.runInService('app', 'rails', ['db:seed'], {
      interactive: true,
    });
  }
};

/**
 * Reset database
 */
export const reset = {
  name: 'db:reset',
  category: 'Database Commands',
  description: 'Reset database (drop, create, migrate, seed)',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Resetting database...');

    await executor.runInService('app', 'rails', ['db:reset'], {
      interactive: true,
    });

    status.success('Database reset complete');
  }
};

// Export all commands as default array
export default [
  rails,
  bundle,
  rake,
  console_cmd,
  test,
  migrate,
  seed,
  reset,
];
