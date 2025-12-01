import Joi from 'joi';

/**
 * Rails Plugin
 *
 * Provides Ruby on Rails-specific commands and configuration.
 */
export default {
  name: 'rails',
  version: '1.0.0',
  description: 'Ruby on Rails framework support',

  /**
   * Configuration schema for Rails-specific settings
   */
  configSchema: Joi.object({
    railsPath: Joi.string().default('rails')
      .description('Path to rails command'),
    bundlerPath: Joi.string().default('bundle')
      .description('Path to bundler command'),
    rakePath: Joi.string().default('rake')
      .description('Path to rake command'),
    testCommand: Joi.string().default('rails test')
      .description('Test command'),
  }),

  /**
   * Commands provided by this plugin
   */
  commands: () => import('./commands/index.js'),

  /**
   * Lifecycle hooks
   */
  hooks: {
    beforeCommand: async (context, command) => {},
    afterCommand: async (context, command, result) => {},
  },
};
