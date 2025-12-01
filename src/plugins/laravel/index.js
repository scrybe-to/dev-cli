import Joi from 'joi';

/**
 * Laravel Plugin
 *
 * Provides Laravel-specific commands and configuration for PHP/Laravel projects.
 */
export default {
  name: 'laravel',
  version: '1.0.0',
  description: 'Laravel framework support for PHP projects',

  /**
   * Configuration schema for Laravel-specific settings
   */
  configSchema: Joi.object({
    artisanPath: Joi.string().default('php artisan')
      .description('Path to artisan command'),
    composerPath: Joi.string().default('composer')
      .description('Path to composer command'),
    phpPath: Joi.string().default('php')
      .description('Path to PHP executable'),
    testCommand: Joi.string().default('php artisan test')
      .description('Test command'),
    formatterCommand: Joi.string().default('./vendor/bin/pint')
      .description('Code formatter command'),
  }),

  /**
   * Commands provided by this plugin
   * Returns a function that imports the commands module
   */
  commands: () => import('./commands/index.js'),

  /**
   * Lifecycle hooks
   */
  hooks: {
    /**
     * Called before a command is executed
     */
    beforeCommand: async (context, command) => {
      // Could be used for Laravel-specific setup
    },

    /**
     * Called after a command is executed
     */
    afterCommand: async (context, command, result) => {
      // Could be used for Laravel-specific cleanup
    },
  },
};
