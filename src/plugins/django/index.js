import Joi from 'joi';

/**
 * Django Plugin
 *
 * Provides Django-specific commands and configuration for Python projects.
 */
export default {
  name: 'django',
  version: '1.0.0',
  description: 'Django framework support for Python projects',

  /**
   * Configuration schema for Django-specific settings
   */
  configSchema: Joi.object({
    managePath: Joi.string().default('python manage.py')
      .description('Path to manage.py command'),
    pythonPath: Joi.string().default('python')
      .description('Path to Python executable'),
    pipPath: Joi.string().default('pip')
      .description('Path to pip command'),
    testCommand: Joi.string().default('python manage.py test')
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
