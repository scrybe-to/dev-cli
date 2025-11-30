/**
 * Example CLI Configuration for a Laravel Project (Scrybe)
 *
 * This demonstrates how to configure the generic dev-cli for a specific project
 */

export default {
  // CLI Identity
  name: 'scrybe',
  version: '1.0.0',
  description: 'Docker Development Environment CLI for Scrybe',

  // Framework Configuration
  framework: 'laravel',

  // Container Name Mappings
  containers: {
    app: 'scrybe_app',
    database: 'scrybe_mysql',
    redis: 'scrybe_redis',
    webserver: 'scrybe_nginx',
    queue: 'scrybe_horizon',
    scheduler: 'scrybe_scheduler',
    storage: 'scrybe_minio',
  },

  // Host Entries for /etc/hosts
  hosts: [
    'scrybe.test',
    'admin.scrybe.test',
    'partners.scrybe.test',
    'evaluators.scrybe.test',
    'api.scrybe.test',
    'mail.scrybe.test',
    'minio.scrybe.test',
    'qdrant.scrybe.test',
  ],

  // Command Configuration
  commands: {
    // Enable/disable core command groups
    docker: true,
    framework: true,
    database: true,
    frontend: true,
    system: true,

    // Custom project-specific commands
    custom: [
      './commands/rag.js',
      './commands/storage.js',
      './commands/deployment.js',
    ]
  },

  // Path Configuration (relative to project root)
  paths: {
    projectRoot: process.cwd(),
    composeFile: 'docker-compose.yml',
    envFile: '.env',
  },

  // Branding Configuration
  branding: {
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
    },
    banner: true,
  },

  // Laravel-Specific Configuration
  laravel: {
    artisanPath: 'php artisan',
    composerPath: 'composer',
    testCommand: 'php artisan test',
    formatterCommand: './vendor/bin/pint',
  },
};
