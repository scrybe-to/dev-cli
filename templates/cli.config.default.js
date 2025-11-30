/**
 * CLI Configuration
 *
 * This file is created automatically when @artifex/dev-cli is installed.
 * Run "npx dev-cli init" to customize it for your project.
 */

import { fileURLToPath } from 'url';
import { dirname, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  // CLI Identity - Customize these via `npx dev-cli init`
  name: basename(__dirname),  // Project name (used in display, config)
  // binaryName: 'custom-binary',  // Optional: different binary name (defaults to name)
  version: '1.0.0',
  description: 'Development CLI',

  // Framework Configuration (laravel, rails, django, express, custom)
  framework: 'custom',

  // Container Name Mappings
  containers: {
    app: 'app',
    database: 'database',
  },

  // Host Entries for /etc/hosts
  hosts: [],

  // Command Configuration
  commands: {
    docker: true,
    framework: false,
    database: true,
    frontend: false,
    system: true,
    custom: [],
  },

  // Path Configuration
  paths: {
    projectRoot: process.cwd(),
    composeFile: 'docker-compose.yml',
    envFile: '.env',
  },

  // Branding
  branding: {
    banner: false,
  },
};
