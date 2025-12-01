/**
 * CLI Configuration
 *
 * Updated to the new generic CLI configuration format.
 */

export default {
  // CLI Identity
  name: 'coverforge',
  binaryName: 'cf',
  version: '1.0.0',
  description: 'Development CLI for coverforge',

  // Execution context configuration
  execution: {
    mode: 'docker',
    docker: {
      composeFile: 'compose.yaml',
      containers: {
        webserver: 'coverforge_nginx',
        adminer: 'coverforge_adminer',
        queue: 'coverforge_horizon',
        scheduler: 'coverforge_scheduler',
        app: 'coverforge_app',
        redisCommander: 'coverforge_redis_commander',
        redis: 'coverforge_redis',
        database: 'coverforge_mysql',
        traefik: 'coverforge_traefik',
        soketi: 'coverforge_soketi',
        mail: 'coverforge_mailpit',
        rustfs: 'coverforge_rustfs',
      },
      // Containers to restart when running `reload` command
      reloadable: ['app', 'queue', 'scheduler'],
    },
    native: {
      shell: process.env.SHELL || '/bin/bash',
    },
    ssh: {
      host: '',
      user: '',
    },
  },

  // Database provider configuration
  database: {
    driver: 'mysql',
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

  // Storage provider configuration
  storage: {
    driver: 'filesystem',
    filesystem: {
      basePath: './storage',
      backupPath: './backups',
      snapshotPath: './snapshots',
    },
  },

  // Hosts management configuration
  hosts: {
    driver: 'none',
    entries: [],
    ip: '127.0.0.1',
  },

  // Path configuration
  paths: {
    projectRoot: process.cwd(),
    envFile: '.env',
  },

  // Plugins configuration
  plugins: {
    enabled: ['laravel'],
    config: {
      laravel: {
        // Laravel-specific configuration (optional)
      },
    },
  },

  // Command groups
  commands: {
    docker: true,
    database: true,
    storage: true,
    system: true,
    custom: ['./commands/dev.js'],
  },

  // Branding configuration
  branding: {
    banner: true,
    asciiBanner: {
      text: 'coverforge',
      font: 'ANSI Shadow',
      gradient: true,
      gradientColors: ['#f12711', '#f5af19'],
    },
  },
};
