import Joi from 'joi';

/**
 * Express Plugin
 *
 * Provides Express/Node.js-specific commands and configuration.
 */
export default {
  name: 'express',
  version: '1.0.0',
  description: 'Express/Node.js framework support',

  /**
   * Configuration schema for Express-specific settings
   */
  configSchema: Joi.object({
    npmPath: Joi.string().default('npm')
      .description('Path to npm command'),
    nodePath: Joi.string().default('node')
      .description('Path to node command'),
    npxPath: Joi.string().default('npx')
      .description('Path to npx command'),
    testCommand: Joi.string().default('npm test')
      .description('Test command'),
    devCommand: Joi.string().default('npm run dev')
      .description('Development server command'),
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
