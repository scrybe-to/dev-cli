/**
 * Test Configuration for Scrybe
 *
 * This is a test config to try out the new CLI without affecting anything
 */

export default {
  name: 'scrybe-new',
  version: '0.1.0',
  description: 'Testing new generic CLI with Scrybe',
  framework: 'laravel',

  containers: {
    app: 'scrybe_app',
    database: 'scrybe_mysql',
    redis: 'scrybe_redis',
    webserver: 'scrybe_nginx',
    queue: 'scrybe_horizon',
    scheduler: 'scrybe_scheduler',
    storage: 'scrybe_minio',
  },

  hosts: ['scrybe.test', 'admin.scrybe.test', 'partners.scrybe.test', 'api.scrybe.test'],

  commands: {
    docker: true,
    framework: true,
    database: true,
    frontend: true,
    system: true,
    custom: [
      // Add custom commands here when ready to test
      // './examples/laravel/commands/rag.js',
    ],
  },

  paths: {
    projectRoot: '/Users/peterbedorjr/code/artifex/scrybe',
    composeFile: 'docker-compose.yml',
    envFile: '.env',
  },

  branding: {
    banner: true,
    asciiBanner: {
      text: 'MEDIA COVERS',
      font: 'ANSI Shadow',
      gradient: true,
      gradientColors: ['#fbc2eb', '#a6c1ee'],
    },
  },

  laravel: {
    artisanPath: 'php artisan',
    composerPath: 'composer',
    testCommand: 'php artisan test',
    formatterCommand: './vendor/bin/pint',
  },
};
