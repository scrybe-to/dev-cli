/**
 * Laravel Framework Commands
 *
 * These commands are loaded when the Laravel plugin is enabled.
 * Commands use the execution context instead of direct Docker calls.
 */

import { status, colors } from '../../../lib/output.js';

/**
 * Get Laravel config from context
 */
function getLaravelConfig(context) {
  return context.plugins?.config?.laravel || {};
}

/**
 * Run Laravel Artisan command
 */
export const artisan = {
  name: 'artisan [args...]',
  category: 'Laravel Commands',
  aliases: ['a'],
  description: 'Run Laravel Artisan command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];

    await executor.runInService('app', 'php', ['artisan', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Run Composer command
 */
export const composer = {
  name: 'composer [args...]',
  category: 'Laravel Commands',
  aliases: ['c'],
  description: 'Run Composer command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const laravelConfig = getLaravelConfig(context);
    const composerPath = laravelConfig.composerPath || 'composer';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', composerPath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Open Laravel Tinker REPL
 */
export const tinker = {
  name: 'tinker',
  category: 'Laravel Commands',
  aliases: ['t'],
  description: 'Open Laravel Tinker REPL',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Opening Laravel Tinker...');
    console.log(colors.dim('Use exit or Ctrl+C to quit'));
    console.log('');

    try {
      await executor.runInService('app', 'php', ['artisan', 'tinker'], {
        interactive: true,
      });
    } catch (error) {
      // Tinker exits normally when user quits, so don't show error for SIGINT
      if (error.exitCode !== 130) {
        throw error;
      }
    }
  }
};

/**
 * Run tests (Pest/PHPUnit)
 */
export const test = {
  name: 'test [args...]',
  category: 'Laravel Commands',
  description: 'Run tests (Pest/PHPUnit)',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    status.info('Running tests...');
    console.log('');

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'php', ['artisan', 'test', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Run Laravel Pint (code formatter)
 */
export const pint = {
  name: 'pint [args...]',
  category: 'Laravel Commands',
  description: 'Run Laravel Pint code formatter',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const laravelConfig = getLaravelConfig(context);
    const pintPath = laravelConfig.formatterCommand || './vendor/bin/pint';

    status.info('Running Laravel Pint...');
    console.log('');

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', pintPath, commandArgs, {
      interactive: true,
    });

    status.success('Code formatting completed');
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
    await executor.runInService('app', 'php', ['artisan', 'migrate', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Run database seeders
 */
export const seed = {
  name: 'seed [args...]',
  category: 'Database Commands',
  aliases: ['s'],
  description: 'Run database seeders',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', 'php', ['artisan', 'db:seed', ...commandArgs], {
      interactive: true,
    });
  }
};

/**
 * Fresh migration with seeds
 */
export const fresh = {
  name: 'fresh',
  category: 'Database Commands',
  description: 'Fresh migration with seeds',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Running fresh migration...');

    await executor.runInService('app', 'php', [
      'artisan', 'migrate:fresh', '--seed'
    ], {
      interactive: true,
    });

    status.success('Database refreshed');
  }
};

/**
 * Optimize Laravel (cache routes, config, views)
 */
export const optimize = {
  name: 'optimize',
  category: 'System',
  aliases: ['o'],
  description: 'Optimize Laravel (cache routes, config, views)',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Optimizing Laravel...');

    await executor.runInService('app', 'php', ['artisan', 'optimize'], {
      interactive: true,
    });

    status.success('Laravel optimized');
  }
};

/**
 * Clear all Laravel caches
 */
export const clear = {
  name: 'clear',
  category: 'System',
  description: 'Clear all Laravel caches',
  action: async (options, context) => {
    const executor = context.getExecutor();

    status.info('Clearing Laravel caches...');

    const commands = [
      'cache:clear',
      'config:clear',
      'route:clear',
      'view:clear',
    ];

    for (const cmd of commands) {
      await executor.runInService('app', 'php', ['artisan', cmd], {
        stdio: 'pipe'
      });
    }

    status.success('All caches cleared');
  }
};

/**
 * Run PHP commands
 */
export const php = {
  name: 'php [args...]',
  category: 'Laravel Commands',
  description: 'Run PHP command',
  allowUnknownOption: true,
  action: async (options, context, variadicArgs) => {
    const executor = context.getExecutor();
    const laravelConfig = getLaravelConfig(context);
    const phpPath = laravelConfig.phpPath || 'php';

    const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    await executor.runInService('app', phpPath, commandArgs, {
      interactive: true,
    });
  }
};

/**
 * Generate auth token for user
 */
export const authToken = {
  name: 'auth-token <user>',
  category: 'Laravel Commands',
  description: 'Generate auth token for user (by email or ID)',
  action: async (options, context, user) => {
    const executor = context.getExecutor();

    if (!user) {
      status.error('User identifier required');
      console.log('');
      console.log('Usage: auth-token <user-id-or-email>');
      console.log('Example: auth-token user@example.com');
      console.log('Example: auth-token 1');
      console.log('');
      return;
    }

    status.info(`Generating auth token for user: ${user}`);
    console.log('');

    try {
      const phpScript = `
        $user = App\\Models\\User::where('email', '${user}')
          ->orWhere('id', '${user}')
          ->first();

        if (!$user) {
          echo "User not found\\n";
          exit(1);
        }

        $token = $user->createToken('CLI Token');
        echo "\\nToken generated for: " . $user->email . "\\n";
        echo "Token: " . $token->plainTextToken . "\\n\\n";
      `;

      await executor.runInService('app', 'php', [
        'artisan', 'tinker', '--execute',
        phpScript.trim()
      ], {
        interactive: true,
      });
    } catch (error) {
      status.error('Failed to generate auth token');
      throw error;
    }
  }
};

// Export all commands as default array
export default [
  artisan,
  composer,
  tinker,
  test,
  pint,
  migrate,
  seed,
  fresh,
  optimize,
  clear,
  php,
  authToken,
];
