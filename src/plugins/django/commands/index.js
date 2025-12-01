/**
 * Django Framework Commands
 *
 * These commands are loaded when the Django plugin is enabled.
 */

import { status, colors } from '../../../lib/output.js';

/**
 * Get Django config from context
 */
function getDjangoConfig(context) {
  return context.plugins?.config?.django || {};
}

/**
 * Run Django manage.py command
 */
export const manage = {
  name: 'manage [args...]',
  category: 'Django Commands',
  aliases: ['m'],
  description: 'Run Django manage.py command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'python', ['manage.py', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Run pip command
 */
export const pip = {
  name: 'pip [args...]',
  category: 'Django Commands',
  description: 'Run pip command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const djangoConfig = getDjangoConfig(context);
    const pipPath = djangoConfig.pipPath || 'pip';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', pipPath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Run Python command
 */
export const python = {
  name: 'python [args...]',
  category: 'Django Commands',
  description: 'Run Python command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const djangoConfig = getDjangoConfig(context);
    const pythonPath = djangoConfig.pythonPath || 'python';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', pythonPath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Open Django shell
 */
export const shell = {
  name: 'shell',
  category: 'Django Commands',
  aliases: ['s'],
  description: 'Open Django shell',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Opening Django shell...');
    console.log(colors.dim('Use exit() or Ctrl+D to quit'));
    console.log('');

    await executor.runInService('app', 'python', ['manage.py', 'shell'], {
      interactive: true,
    });
  }
};

/**
 * Run tests
 */
export const test = {
  name: 'test [args...]',
  category: 'Django Commands',
  description: 'Run tests',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    status.info('Running tests...');
    console.log('');

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'python', ['manage.py', 'test', ...commandArgs], {
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
  description: 'Run database migrations',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'python', ['manage.py', 'migrate', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Make migrations
 */
export const makemigrations = {
  name: 'makemigrations [args...]',
  category: 'Database Commands',
  aliases: ['mm'],
  description: 'Create new migrations',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'python', ['manage.py', 'makemigrations', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Create superuser
 */
export const createsuperuser = {
  name: 'createsuperuser',
  category: 'Django Commands',
  description: 'Create a superuser',
  action: async (options, context) => {
    const executor = context.getExecutor();

    await executor.runInService('app', 'python', ['manage.py', 'createsuperuser'], {
      interactive: true,
    });
  }
};

/**
 * Collect static files
 */
export const collectstatic = {
  name: 'collectstatic',
  category: 'Django Commands',
  description: 'Collect static files',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Collecting static files...');

    await executor.runInService('app', 'python', ['manage.py', 'collectstatic', '--noinput'], {
      interactive: true,
    });

    status.success('Static files collected');
  }
};

// Export all commands as default array
export default [
  manage,
  pip,
  python,
  shell,
  test,
  migrate,
  makemigrations,
  createsuperuser,
  collectstatic,
];
