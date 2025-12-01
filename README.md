# @artifex/dev-cli

A generic, configurable Docker development CLI that can be adapted to any framework or project structure.

## Architecture

### Core Principles

1. **Context = Data** - Configuration, paths, container names, environment variables
2. **Functions = Imports** - All utilities, helpers, and operations are imported
3. **Framework Agnostic** - Support Laravel, Rails, Django, Node.js, custom stacks
4. **Extensible** - Easy plugin system for custom commands

### Directory Structure

```
cli-new/
├── src/
│   ├── core/
│   │   ├── config-loader.js    # Loads & validates cli.config.js
│   │   ├── context.js          # Context class (data only)
│   │   ├── command-loader.js   # Dynamic command loading
│   │   └── cli.js              # Main CLI orchestrator
│   ├── commands/
│   │   ├── docker/             # Core Docker commands
│   │   ├── frameworks/         # Framework-specific commands
│   │   ├── database/           # Generic DB commands
│   │   ├── frontend/           # Generic frontend commands
│   │   └── system/             # Generic system commands
│   ├── lib/
│   │   ├── docker.js           # Docker utilities (execContainer, compose, etc.)
│   │   ├── output.js           # Terminal styling (status, colors, spinner)
│   │   └── utils.js            # Shared helpers
│   └── templates/              # Project scaffolding templates
├── bin/
│   └── dev-cli.js              # Executable entry point
└── examples/
    └── laravel/
        ├── cli.config.js       # Example Laravel config
        └── commands/           # Example custom commands
```

## Usage

### In Your Project

1. Install the CLI:
```bash
npm install --save-dev @artifex/dev-cli
```

2. Create `cli.config.js` at project root:
```javascript
export default {
  name: 'myapp',
  version: '1.0.0',
  framework: 'laravel',

  containers: {
    app: 'myapp_app',
    database: 'myapp_mysql',
    redis: 'myapp_redis',
  },

  hosts: [
    'myapp.test',
    'api.myapp.test',
  ],

  commands: {
    custom: ['./commands/stripe.js', './commands/algolia.js']
  }
};
```

3. Run commands:
```bash
npx dev-cli up
npx dev-cli artisan migrate
npx dev-cli stripe:webhooks
```

### Creating Custom Commands

```javascript
// commands/stripe.js
import { execContainer, status } from '@artifex/dev-cli';

export default {
  name: 'stripe:webhooks',
  description: 'Forward Stripe webhooks locally',
  options: [
    { flags: '--events <events>', description: 'Events to listen for' }
  ],
  action: async (options, context) => {
    const { containers } = context;

    status.info('Starting Stripe webhook forwarding...');

    await execContainer(containers.app, 'stripe', [
      'listen',
      '--forward-to', 'localhost:3000/webhooks/stripe',
      ...(options.events ? ['--events', options.events] : [])
    ]);
  }
};
```

### Commands with Subcommands

You can group related commands under a parent command using `subcommands`:

```javascript
// commands/cache.js
export default {
  name: 'cache',
  description: 'Cache management commands',
  subcommands: [
    {
      name: 'clear',
      description: 'Clear all caches',
      action: async (options, context) => {
        // Clear cache logic
      }
    },
    {
      name: 'warmup',
      description: 'Warm up caches',
      options: [
        { flags: '--tags <tags>', description: 'Cache tags to warm' }
      ],
      action: async (options, context) => {
        // Warmup logic
      }
    }
  ]
};
```

This creates:
- `dev-cli cache` - Shows help with available subcommands
- `dev-cli cache clear` - Runs the clear action
- `dev-cli cache warmup --tags=views` - Runs warmup with options

## API Reference

### Exports

```javascript
// Main exports
import {
  // Context & Config
  Context,
  loadConfig,

  // Docker utilities
  execContainer,
  compose,
  checkDocker,
  checkContainers,

  // Output utilities
  status,
  colors,
  createSpinner,

  // Framework adapters
  LaravelAdapter,
  RailsAdapter,
  DjangoAdapter,

  // Helpers
  loadEnvVars,
  parseEnvFile,
} from '@artifex/dev-cli';
```

### Context Structure

```typescript
interface Context {
  config: {
    name: string;
    version: string;
    framework: string;
  };

  containers: Record<string, string>;

  paths: {
    projectRoot: string;
    composeFile: string;
    envFile: string;
  };

  env: Record<string, string>;

  runtime: {
    debug: boolean;
    verbose: boolean;
  };
}
```

## Development

This is a work-in-progress extraction from the Scrybe CLI, being built alongside the current implementation to allow for iteration and testing.

### Current Status

- [ ] Core config loader
- [ ] Context system
- [ ] Command loader
- [ ] Docker utilities
- [ ] Framework adapters
- [ ] Example commands
- [ ] Documentation
- [ ] Tests

### Building Locally

```bash
cd cli-new
npm install
npm run dev
```

## Migration from Existing CLI

The new CLI is being built to be backwards-compatible with the existing Scrybe CLI. Once stable, we can:

1. Replace current CLI implementation
2. Extract to separate npm package
3. Publish for use in other projects
