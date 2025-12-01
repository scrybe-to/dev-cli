import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import Joi from 'joi';

/**
 * Configuration schema validation - New generic schema
 */
const configSchema = Joi.object({
  // CLI Identity
  name: Joi.string().required()
    .description('CLI name (project name)'),

  binaryName: Joi.string().optional()
    .description('Binary name (defaults to name if not specified)'),

  version: Joi.string().default('1.0.0')
    .description('CLI version'),

  description: Joi.string().optional()
    .description('CLI description'),

  // Execution context configuration
  execution: Joi.object({
    mode: Joi.string().valid('docker', 'native', 'ssh').default('docker')
      .description('Execution mode'),

    docker: Joi.object({
      composeFile: Joi.string().default('docker-compose.yml')
        .description('Docker Compose file path'),
      containers: Joi.object().pattern(
        Joi.string(),
        Joi.string()
      ).default({})
        .description('Container name mappings'),
      reloadable: Joi.array().items(Joi.string()).default([])
        .description('Containers to reload on configuration changes'),
    }).default(),

    native: Joi.object({
      shell: Joi.string().default(process.env.SHELL || '/bin/bash')
        .description('Shell to use for native execution'),
      workingDir: Joi.string().optional()
        .description('Working directory (defaults to projectRoot)'),
    }).default(),

    ssh: Joi.object({
      host: Joi.string().allow('').default('')
        .description('SSH host'),
      user: Joi.string().allow('').default('')
        .description('SSH user'),
      port: Joi.number().default(22)
        .description('SSH port'),
      keyPath: Joi.string().allow('').optional()
        .description('Path to SSH private key'),
      workingDir: Joi.string().default('~')
        .description('Remote working directory'),
      strictHostKeyChecking: Joi.boolean().default(true)
        .description('Enable strict host key checking'),
    }).default(),
  }).default(),

  // Database provider configuration
  database: Joi.object({
    driver: Joi.string().valid('mysql', 'postgres', 'postgresql', 'sqlite', 'none').default('none')
      .description('Database driver'),
    credentialSource: Joi.string().valid('env', 'config').default('env')
      .description('Where to read credentials from'),
    envMapping: Joi.object({
      host: Joi.string().default('DB_HOST'),
      port: Joi.string().default('DB_PORT'),
      database: Joi.string().default('DB_DATABASE'),
      username: Joi.string().default('DB_USERNAME'),
      password: Joi.string().default('DB_PASSWORD'),
    }).default()
      .description('Environment variable mapping for credentials'),
    credentials: Joi.object({
      host: Joi.string().allow('').default(''),
      port: Joi.number().optional(),
      database: Joi.string().allow('').default(''),
      username: Joi.string().allow('').default(''),
      password: Joi.string().allow('').default(''),
    }).default()
      .description('Direct credentials (when credentialSource is "config")'),
    backup: Joi.object({
      path: Joi.string().default('./backups/database')
        .description('Directory for database backups'),
      format: Joi.string().valid('sql', 'dump', 'archive').default('sql')
        .description('Backup format'),
    }).default(),
  }).default(),

  // Storage provider configuration
  storage: Joi.object({
    driver: Joi.string().valid('filesystem', 's3', 'minio', 'none').default('filesystem')
      .description('Storage driver'),
    filesystem: Joi.object({
      basePath: Joi.string().default('./storage')
        .description('Base storage path'),
      backupPath: Joi.string().default('./backups')
        .description('Backup directory path'),
      snapshotPath: Joi.string().default('./snapshots')
        .description('Snapshot directory path'),
    }).default(),
    objectStorage: Joi.object({
      endpoint: Joi.string().allow('').default('')
        .description('S3/MinIO endpoint URL'),
      accessKey: Joi.string().allow('').default('')
        .description('Access key (or use AWS_ACCESS_KEY_ID env var)'),
      secretKey: Joi.string().allow('').default('')
        .description('Secret key (or use AWS_SECRET_ACCESS_KEY env var)'),
      bucket: Joi.string().allow('').default('')
        .description('Bucket name'),
      region: Joi.string().default('us-east-1')
        .description('AWS region'),
      credentialSource: Joi.string().valid('env', 'config').default('env')
        .description('Where to read credentials from'),
      cliTool: Joi.string().valid('aws', 'mc', 'auto').default('auto')
        .description('CLI tool to use (aws cli or minio client)'),
    }).default(),
  }).default(),

  // Hosts management configuration
  hosts: Joi.object({
    driver: Joi.string().valid('etc-hosts', 'none').default('none')
      .description('Hosts management driver'),
    entries: Joi.array().items(Joi.string()).default([])
      .description('Host entries to manage'),
    ip: Joi.string().default('127.0.0.1')
      .description('IP address for host entries'),
  }).default(),

  // Paths configuration
  paths: Joi.object({
    projectRoot: Joi.string().default(process.cwd())
      .description('Project root directory'),
    envFile: Joi.string().default('.env')
      .description('Environment file path'),
  }).default(),

  // Plugins configuration
  plugins: Joi.object({
    enabled: Joi.array().items(Joi.string()).default([])
      .description('List of enabled plugins'),
    config: Joi.object().pattern(
      Joi.string(),
      Joi.object()
    ).default({})
      .description('Plugin-specific configuration'),
  }).default(),

  // Command groups
  commands: Joi.object({
    docker: Joi.boolean().default(true)
      .description('Enable Docker commands'),
    database: Joi.boolean().default(true)
      .description('Enable database commands'),
    storage: Joi.boolean().default(true)
      .description('Enable storage commands'),
    system: Joi.boolean().default(true)
      .description('Enable system commands'),
    custom: Joi.array().items(Joi.string()).default([])
      .description('Paths to custom command files'),
  }).default(),

  // Branding configuration
  branding: Joi.object({
    banner: Joi.boolean().default(true)
      .description('Show banner on startup'),
    asciiBanner: Joi.object({
      text: Joi.string().optional()
        .description('Banner text (defaults to project name)'),
      font: Joi.string().default('Standard')
        .description('Figlet font name'),
      color: Joi.string().default('cyan')
        .description('Banner color'),
      gradient: Joi.boolean().default(false)
        .description('Enable gradient colors'),
      gradientColors: Joi.array().items(Joi.string()).min(2).default(['#667eea', '#764ba2'])
        .description('Gradient color stops'),
    }).default(),
  }).default(),
}).unknown(true); // Allow additional properties for flexibility

/**
 * Find Docker Compose file from common variants
 */
function findComposeFile(projectRoot, preferredFile = null) {
  if (preferredFile && fs.existsSync(preferredFile)) {
    return preferredFile;
  }

  const variants = [
    'compose.yaml',
    'compose.yml',
    'docker-compose.yaml',
    'docker-compose.yml',
  ];

  for (const variant of variants) {
    const filePath = path.join(projectRoot, variant);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * Load and validate configuration from cli.config.js
 *
 * @param {string} configPath - Path to config file (defaults to cwd/cli.config.js)
 * @returns {Promise<Object>} Validated configuration object
 * @throws {Error} If config is invalid or not found
 */
export async function loadConfig(configPath = null) {
  const cwd = process.cwd();
  const defaultConfigPath = path.join(cwd, 'cli.config.js');
  const finalConfigPath = configPath || process.env.CLI_CONFIG_PATH || defaultConfigPath;

  // Check if config exists
  if (!fs.existsSync(finalConfigPath)) {
    throw new Error(
      `Configuration file not found: ${finalConfigPath}\n\n` +
      `Create a cli.config.js file at your project root with:\n\n` +
      `export default {\n` +
      `  name: 'myproject',\n` +
      `  execution: {\n` +
      `    mode: 'docker',\n` +
      `    docker: { containers: { app: 'myproject_app' } }\n` +
      `  },\n` +
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

  // Resolve paths to absolute
  value.paths.projectRoot = path.resolve(cwd, value.paths.projectRoot);
  value.paths.envFile = path.resolve(value.paths.projectRoot, value.paths.envFile);

  // Resolve native working directory
  if (!value.execution.native.workingDir) {
    value.execution.native.workingDir = value.paths.projectRoot;
  } else {
    value.execution.native.workingDir = path.resolve(
      value.paths.projectRoot,
      value.execution.native.workingDir
    );
  }

  // Auto-detect compose file if using Docker mode
  if (value.execution.mode === 'docker') {
    const composeFile = value.execution.docker.composeFile;
    const specifiedComposeFile = path.isAbsolute(composeFile)
      ? composeFile
      : path.resolve(value.paths.projectRoot, composeFile);

    const actualComposeFile = findComposeFile(value.paths.projectRoot, specifiedComposeFile);

    if (actualComposeFile) {
      value.execution.docker.composeFile = actualComposeFile;
    } else {
      value.execution.docker.composeFile = specifiedComposeFile;
    }
  }

  // Add metadata
  value._meta = {
    configPath: finalConfigPath,
    loadedAt: new Date().toISOString(),
  };

  return value;
}

/**
 * Get default configuration for a new project
 *
 * @param {Object} options - Configuration options
 * @param {string} options.name - Project name
 * @param {string} options.executionMode - Execution mode (docker, native, ssh)
 * @param {string} options.databaseDriver - Database driver
 * @param {string[]} options.plugins - Plugins to enable
 * @returns {Object} Default configuration
 */
export function getDefaultConfig(options = {}) {
  const {
    name = 'myproject',
    executionMode = 'docker',
    databaseDriver = 'none',
    plugins = [],
  } = options;

  const config = {
    name,
    version: '1.0.0',
    description: `Development CLI for ${name}`,

    execution: {
      mode: executionMode,
      docker: {
        composeFile: 'docker-compose.yml',
        containers: {},
        reloadable: [],
      },
      native: {
        shell: process.env.SHELL || '/bin/bash',
      },
      ssh: {
        host: '',
        user: '',
      },
    },

    database: {
      driver: databaseDriver,
      credentialSource: 'env',
      envMapping: {
        host: 'DB_HOST',
        port: 'DB_PORT',
        database: 'DB_DATABASE',
        username: 'DB_USERNAME',
        password: 'DB_PASSWORD',
      },
      backup: {
        path: './backups/database',
      },
    },

    storage: {
      driver: 'filesystem',
      filesystem: {
        basePath: './storage',
        backupPath: './backups',
        snapshotPath: './snapshots',
      },
    },

    hosts: {
      driver: 'none',
      entries: [],
      ip: '127.0.0.1',
    },

    paths: {
      projectRoot: process.cwd(),
      envFile: '.env',
    },

    plugins: {
      enabled: plugins,
      config: {},
    },

    commands: {
      docker: executionMode === 'docker',
      database: databaseDriver !== 'none',
      storage: true,
      system: true,
      custom: [],
    },

    branding: {
      banner: true,
      asciiBanner: {
        text: name.toUpperCase(),
        font: 'Standard',
        gradient: false,
      },
    },
  };

  return config;
}

/**
 * Generate a configuration file content string
 *
 * @param {Object} config - Configuration object
 * @returns {string} JavaScript config file content
 */
export function generateConfigFileContent(config) {
  const content = `export default ${JSON.stringify(config, null, 2)};\n`;
  return content;
}
