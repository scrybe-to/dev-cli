/**
 * Express/Node.js Framework Commands
 *
 * These commands are loaded when the Express plugin is enabled.
 */

import { status, colors } from '../../../lib/output.js';

/**
 * Get Express config from context
 */
function getExpressConfig(context) {
  return context.plugins?.config?.express || {};
}

/**
 * Run npm command
 */
export const npm = {
  name: 'npm [args...]',
  category: 'Node.js Commands',
  description: 'Run npm command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const expressConfig = getExpressConfig(context);
    const npmPath = expressConfig.npmPath || 'npm';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', npmPath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Run node command
 */
export const node = {
  name: 'node [args...]',
  category: 'Node.js Commands',
  description: 'Run Node.js command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const expressConfig = getExpressConfig(context);
    const nodePath = expressConfig.nodePath || 'node';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', nodePath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Run npx command
 */
export const npx = {
  name: 'npx [args...]',
  category: 'Node.js Commands',
  description: 'Run npx command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const expressConfig = getExpressConfig(context);
    const npxPath = expressConfig.npxPath || 'npx';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', npxPath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Open Node.js REPL
 */
export const repl = {
  name: 'repl',
  category: 'Node.js Commands',
  description: 'Open Node.js REPL',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Opening Node.js REPL...');
    console.log(colors.dim('Use .exit or Ctrl+D to quit'));
    console.log('');

    await executor.runInService('app', 'node', [], {
      interactive: true,
    });
  }
};

/**
 * Run tests
 */
export const test = {
  name: 'test [args...]',
  category: 'Node.js Commands',
  description: 'Run tests',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    status.info('Running tests...');
    console.log('');

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'npm', ['test', '--', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Start development server
 */
export const dev = {
  name: 'dev',
  category: 'Node.js Commands',
  description: 'Start development server',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Starting development server...');
    console.log('');

    await executor.runInService('app', 'npm', ['run', 'dev'], {
      interactive: true,
    });
  }
};

/**
 * Install dependencies
 */
export const install = {
  name: 'install [packages...]',
  category: 'Node.js Commands',
  aliases: ['i'],
  description: 'Install npm packages',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    const packages = Array.isArray(variadicArgs) ? variadicArgs : [];

    if (packages.length > 0) {
      status.info(`Installing packages: ${packages.join(', ')}`);
    } else {
      status.info('Installing dependencies...');
    }
    console.log('');

    await executor.runInService('app', 'npm', ['install', ...packages], {
      interactive: true,
    });

    status.success('Installation complete');
  }
};

/**
 * Run build
 */
export const build = {
  name: 'build',
  category: 'Node.js Commands',
  description: 'Run build script',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Building...');
    console.log('');

    await executor.runInService('app', 'npm', ['run', 'build'], {
      interactive: true,
    });

    status.success('Build complete');
  }
};

/**
 * Run lint
 */
export const lint = {
  name: 'lint [args...]',
  category: 'Node.js Commands',
  description: 'Run linter',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    status.info('Running linter...');
    console.log('');

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'npm', ['run', 'lint', '--', ...commandArgs], {
      interactive: true,
    });
  }
};

// Export all commands as default array
export default [
  npm,
  node,
  npx,
  repl,
  test,
  dev,
  install,
  build,
  lint,
];
