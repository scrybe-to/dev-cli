# Development Guide

## Getting Started

### Installation

```bash
cd cli-new
npm install
```

### Testing Locally

The CLI can be tested without building by running directly:

```bash
# From cli-new directory
node bin/dev-cli.js --help

# Or use npm script
npm run dev -- --help
```

### Using with Example Configuration

Copy the example config to test:

```bash
# Copy example config to project root
cp examples/laravel/cli.config.js ../../cli.config.js

# Run commands
node bin/dev-cli.js up
node bin/dev-cli.js artisan --help
```

## Architecture Overview

### Data vs Behavior Separation

**Key Principle**: Context contains data, functions are imported.

```javascript
// ✅ GOOD: Context = data, functions = imports
import { execContainer, status } from '@artifex/dev-cli';

export default {
  action: async (options, context) => {
    const { containers } = context; // Get data from context
    await execContainer(containers.app, 'php', ['artisan']); // Import function
  }
};

// ❌ BAD: Context as God object with methods
export default {
  action: async (options, context) => {
    await context.execContainer('app', 'php', ['artisan']); // Bad: method on context
  }
};
```

### Adding Commands

#### Core Commands

Located in `src/commands/`:

- `docker/` - Docker Compose operations
- `frameworks/` - Framework-specific commands (laravel, rails, django)
- `database/` - Database operations
- `frontend/` - Frontend tooling
- `system/` - System utilities

Example core command:

```javascript
// src/commands/docker/restart.js
import { compose } from '../../lib/docker.js';
import { status } from '../../lib/output.js';

export default {
  name: 'restart',
  description: 'Restart all containers',
  action: async (options, context) => {
    const { paths } = context;

    status.info('Restarting containers...');
    await compose(paths.composeFile, paths.envFile, ['restart']);
    status.success('Containers restarted');
  }
};
```

#### Custom Commands

Custom commands live in your project (e.g., `commands/mycommand.js`):

```javascript
// commands/stripe.js
import { execContainer, status, colors } from '@artifex/dev-cli';

export default {
  name: 'stripe:webhooks',
  description: 'Forward Stripe webhooks',
  options: [
    { flags: '--events <events>', description: 'Events to listen for' }
  ],
  action: async (options, context) => {
    const { containers } = context;

    status.info('Starting Stripe webhooks...');

    await execContainer(containers.app, 'stripe', [
      'listen',
      '--forward-to', 'localhost:3000/webhooks/stripe',
    ]);
  }
};
```

Register in `cli.config.js`:

```javascript
export default {
  // ...
  commands: {
    custom: ['./commands/stripe.js']
  }
};
```

### Command Structure

```javascript
export default {
  // Required
  name: 'command-name [args...]',  // Command name with optional arguments
  action: async (options, context, ...args) => { }, // Command handler

  // Optional
  description: 'Command description',
  alias: 'cmd',                    // Single alias
  aliases: ['c', 'cmd'],          // Multiple aliases

  options: [                       // Command options/flags
    {
      flags: '--force',
      description: 'Force operation',
      defaultValue: false
    }
  ],

  arguments: [                     // Positional arguments
    {
      name: '<file>',
      description: 'File to process'
    }
  ],

  allowUnknownOption: true,       // Allow passing unknown flags
};
```

### Context API

Context is a read-only data object:

```javascript
{
  config: {
    name: 'scrybe',
    version: '1.0.0',
    framework: 'laravel',
  },

  containers: {
    app: 'scrybe_app',
    database: 'scrybe_mysql',
    // ...
  },

  paths: {
    projectRoot: '/path/to/project',
    composeFile: '/path/to/docker-compose.yml',
    envFile: '/path/to/.env',
  },

  hosts: ['scrybe.test', 'api.scrybe.test'],

  env: { /* parsed .env variables */ },

  runtime: {
    debug: false,
    verbose: false,
  },

  framework: { /* framework-specific config */ }
}
```

### Available Imports

#### Docker Utilities

```javascript
import {
  execContainer,      // Execute command in container
  compose,           // Run docker compose commands
  checkDocker,       // Verify Docker is running
  checkContainers,   // Verify containers are running
  getRunningContainers,
  getContainerStats,
  withDocker,        // Wrapper ensuring Docker is running
} from '@artifex/dev-cli';
```

#### Output Utilities

```javascript
import {
  status,           // status.info(), status.success(), status.error()
  colors,          // colors.red(), colors.green(), colors.cyan()
  createSpinner,   // Loading spinners
  createBox,       // Boxed messages
  displayBanner,   // CLI banner
  exitWithError,   // Error and exit
} from '@artifex/dev-cli';
```

#### General Utilities

```javascript
import {
  loadEnvVars,     // Parse .env files
  formatBytes,     // Format byte sizes
  sleep,           // Async sleep
  hasTTY,          // Check TTY availability
  ensureDir,       // Create directory if missing
  readJSON,        // Safe JSON reading
  writeJSON,       // Safe JSON writing
} from '@artifex/dev-cli';
```

## Configuration

### cli.config.js Schema

```javascript
export default {
  // Required
  name: 'myapp',
  framework: 'laravel', // 'laravel' | 'rails' | 'django' | 'express' | 'custom'
  containers: {
    app: 'myapp_app',
    // ... more containers
  },

  // Optional
  version: '1.0.0',
  description: 'My app CLI',

  hosts: ['myapp.test'],

  commands: {
    docker: true,      // Enable core Docker commands
    framework: true,   // Enable framework commands
    database: true,    // Enable database commands
    frontend: true,    // Enable frontend commands
    system: true,      // Enable system commands
    custom: [          // Custom command paths
      './commands/custom.js',
      './commands/integrations/',
    ]
  },

  paths: {
    projectRoot: process.cwd(),
    composeFile: 'docker-compose.yml',
    envFile: '.env',
  },

  branding: {
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
    },
    banner: true,
  },

  // Framework-specific config
  laravel: {
    artisanPath: 'php artisan',
    composerPath: 'composer',
    testCommand: 'php artisan test',
    formatterCommand: './vendor/bin/pint',
  },
};
```

## Testing

### Manual Testing

1. Create a test config:
```bash
cp examples/laravel/cli.config.js ../../test-cli.config.js
```

2. Run commands:
```bash
node bin/dev-cli.js --help
node bin/dev-cli.js up
node bin/dev-cli.js artisan list
```

### Debugging

Enable debug mode:

```bash
DEBUG=1 node bin/dev-cli.js command
```

Or use the --debug flag:

```bash
node bin/dev-cli.js --debug command
```

## Building

For production use, build with Vite:

```bash
npm run build
```

This creates `dist/index.js` - a single bundled file.

## Publishing (Future)

Once stable, this can be published to npm:

```bash
npm version minor
npm publish --access public
```

Projects would then install via:

```bash
npm install --save-dev @artifex/dev-cli
```

And create their config:

```bash
npx @artifex/dev-cli init
```
