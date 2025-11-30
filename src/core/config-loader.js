import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import Joi from 'joi';
import { findComposeFile } from '../lib/docker.js';

/**
 * Configuration schema validation
 */
const configSchema = Joi.object({
  name: Joi.string().required()
    .description('CLI name (project name)'),

  binaryName: Joi.string().optional()
    .description('Binary name (defaults to name if not specified)'),

  version: Joi.string().default('1.0.0')
    .description('CLI version'),

  description: Joi.string().optional()
    .description('CLI description'),

  framework: Joi.string().valid('laravel', 'rails', 'django', 'express', 'custom').required()
    .description('Framework type'),

  containers: Joi.object().pattern(
    Joi.string(),
    Joi.string()
  ).required()
    .description('Container name mappings'),

  hosts: Joi.array().items(Joi.string()).default([])
    .description('Host entries for /etc/hosts'),

  commands: Joi.object({
    docker: Joi.boolean().default(true),
    framework: Joi.boolean().default(true),
    database: Joi.boolean().default(true),
    frontend: Joi.boolean().default(true),
    system: Joi.boolean().default(true),
    storage: Joi.boolean().default(true),
    custom: Joi.array().items(Joi.string()).default([])
  }).default(),

  paths: Joi.object({
    projectRoot: Joi.string().default(process.cwd()),
    composeFile: Joi.string().default('docker-compose.yml'),
    envFile: Joi.string().default('.env'),
  }).default(),

  branding: Joi.object({
    banner: Joi.boolean().default(true),
    asciiBanner: Joi.object({
      text: Joi.string(),
      font: Joi.string().default('Standard'),  // Any figlet font name
      color: Joi.string().default('cyan'),
      gradient: Joi.boolean().default(false),
      gradientColors: Joi.array().items(Joi.string()).min(2).default(['#667eea', '#764ba2']),
    }).optional(),
  }).default(),

  // Framework-specific configuration
  laravel: Joi.object({
    artisanPath: Joi.string().default('php artisan'),
    composerPath: Joi.string().default('composer'),
    testCommand: Joi.string().default('php artisan test'),
    formatterCommand: Joi.string().default('./vendor/bin/pint'),
  }).optional(),

  rails: Joi.object({
    railsPath: Joi.string().default('rails'),
    bundlerPath: Joi.string().default('bundle'),
    testCommand: Joi.string().default('rails test'),
  }).optional(),

  django: Joi.object({
    managePath: Joi.string().default('python manage.py'),
    testCommand: Joi.string().default('python manage.py test'),
  }).optional(),
}).unknown(false);

/**
 * Load and validate configuration from cli.config.js
 *
 * @param {string} configPath - Path to config file (defaults to cwd/cli.config.js)
 * @returns {Promise<Object>} Validated configuration object
 * @throws {Error} If config is invalid or not found
 */
export async function loadConfig(configPath = null) {
  // Determine config file path
  // Priority: 1. passed configPath, 2. CLI_CONFIG_PATH env var, 3. cwd/cli.config.js
  const cwd = process.cwd();
  const defaultConfigPath = path.join(cwd, 'cli.config.js');
  const finalConfigPath = configPath || process.env.CLI_CONFIG_PATH || defaultConfigPath;

  // Check if config exists
  if (!fs.existsSync(finalConfigPath)) {
    throw new Error(
      `Configuration file not found: ${finalConfigPath}\n\n` +
      `Create a cli.config.js file at your project root with:\n\n` +
      `export default {\n` +
      `  name: 'myapp',\n` +
      `  framework: 'laravel',\n` +
      `  containers: { app: 'myapp_app' },\n` +
      `  // ... more config\n` +
      `};\n`
    );
  }

  // Load config file
  let config;
  try {
    const configUrl = pathToFileURL(finalConfigPath).href;
    const module = await import(configUrl);
    config = module.default;
  } catch (error) {
    throw new Error(
      `Failed to load configuration from ${finalConfigPath}:\n${error.message}`
    );
  }

  // Validate config
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    const errorDetails = error.details
      .map(detail => `  - ${detail.path.join('.')}: ${detail.message}`)
      .join('\n');

    throw new Error(
      `Invalid configuration in ${finalConfigPath}:\n\n${errorDetails}\n`
    );
  }

  // Resolve relative paths to absolute
  value.paths.projectRoot = path.resolve(cwd, value.paths.projectRoot);

  // Auto-detect compose file if the specified one doesn't exist
  const specifiedComposeFile = path.resolve(value.paths.projectRoot, value.paths.composeFile);
  const actualComposeFile = findComposeFile(value.paths.projectRoot, specifiedComposeFile);

  if (actualComposeFile) {
    value.paths.composeFile = actualComposeFile;
  } else {
    // Keep the specified path (will error later when trying to use it)
    value.paths.composeFile = specifiedComposeFile;
  }

  value.paths.envFile = path.resolve(value.paths.projectRoot, value.paths.envFile);

  // Add metadata
  value._meta = {
    configPath: finalConfigPath,
    loadedAt: new Date().toISOString(),
  };

  return value;
}

/**
 * Get default configuration for a framework
 * Useful for scaffolding new projects
 *
 * @param {string} framework - Framework type
 * @param {string} projectName - Project name
 * @returns {Object} Default configuration
 */
export function getDefaultConfig(framework, projectName) {
  const baseConfig = {
    name: projectName,
    version: '1.0.0',
    framework,
    hosts: [`${projectName}.test`],
  };

  switch (framework) {
    case 'laravel':
      return {
        ...baseConfig,
        description: `Docker Development Environment CLI for ${projectName}`,
        containers: {
          app: `${projectName}_app`,
          database: `${projectName}_mysql`,
          redis: `${projectName}_redis`,
          webserver: `${projectName}_nginx`,
          queue: `${projectName}_horizon`,
        },
        hosts: [
          `${projectName}.test`,
          `admin.${projectName}.test`,
          `api.${projectName}.test`,
          `mail.${projectName}.test`,
        ],
        laravel: {
          artisanPath: 'php artisan',
          composerPath: 'composer',
          testCommand: 'php artisan test',
          formatterCommand: './vendor/bin/pint',
        },
      };

    case 'rails':
      return {
        ...baseConfig,
        containers: {
          app: `${projectName}_web`,
          database: `${projectName}_postgres`,
          redis: `${projectName}_redis`,
        },
        rails: {
          railsPath: 'rails',
          bundlerPath: 'bundle',
          testCommand: 'rails test',
        },
      };

    case 'django':
      return {
        ...baseConfig,
        containers: {
          app: `${projectName}_web`,
          database: `${projectName}_postgres`,
          redis: `${projectName}_redis`,
        },
        django: {
          managePath: 'python manage.py',
          testCommand: 'python manage.py test',
        },
      };

    default:
      return {
        ...baseConfig,
        containers: {
          app: `${projectName}_app`,
        },
      };
  }
}
