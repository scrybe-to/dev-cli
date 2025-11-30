# Quick Start Guide

## What We Built

A generic, configurable Docker development CLI that can be adapted to any project. The key innovation is **separating data from behavior**:

- **Context = Data** (configuration, container names, paths, env vars)
- **Functions = Imports** (all operations are imported utilities)

## Try It Out

### 1. Install Dependencies

```bash
cd .dev/cli-new
npm install
```

### 2. Test with Example Config

```bash
# Copy the example Laravel config to project root
cp examples/laravel/cli.config.js ../../cli.config.js

# Try some commands
node bin/dev-cli.js --help
node bin/dev-cli.js ps
node bin/dev-cli.js artisan --help
```

### 3. Create Your Own Config

Edit `cli.config.js` at project root:

```javascript
export default {
  name: 'myapp',
  framework: 'laravel',

  containers: {
    app: 'myapp_app',
    database: 'myapp_mysql',
  },

  commands: {
    custom: ['./commands/mycommand.js']
  }
};
```

### 4. Add Custom Commands

Create `commands/mycommand.js`:

```javascript
import { execContainer, status } from '@artifex/dev-cli';

export default {
  name: 'mycommand',
  description: 'My custom command',
  action: async (options, context) => {
    const { containers } = context;

    status.info('Running my command...');
    // Your logic here
  }
};
```

## Key Concepts

### Context (Data Only)

```javascript
// In your command
action: async (options, context) => {
  // Context provides data
  const { containers, config, paths, env } = context;

  console.log(containers.app);     // 'myapp_app'
  console.log(config.framework);   // 'laravel'
  console.log(paths.projectRoot);  // '/path/to/project'
}
```

### Imports (Functions Only)

```javascript
// Import what you need
import {
  execContainer,     // Run command in container
  compose,          // Docker compose operations
  status,           // status.info(), status.success()
  colors,          // Terminal colors
  createSpinner,   // Loading spinner
} from '@artifex/dev-cli';

// Use in your command
await execContainer(containers.app, 'php', ['artisan', 'migrate']);
```

## Command Structure

```javascript
export default {
  name: 'command-name [args...]',
  description: 'What it does',

  // Optional: aliases
  aliases: ['cmd', 'c'],

  // Optional: flags/options
  options: [
    { flags: '--force', description: 'Force operation' }
  ],

  // Required: action handler
  action: async (options, context, ...args) => {
    // Access context data
    const { containers } = context;

    // Import and use functions
    await execContainer(containers.app, 'command', args);
  }
};
```

## Available Utilities

### Docker

```javascript
import {
  execContainer,        // Run in container
  compose,             // Docker compose
  checkDocker,         // Verify Docker running
  getRunningContainers // List containers
} from '@artifex/dev-cli';
```

### Output

```javascript
import {
  status,       // .info() .success() .error()
  colors,       // .red() .green() .cyan()
  createSpinner // Loading spinner
} from '@artifex/dev-cli';
```

### Utilities

```javascript
import {
  loadEnvVars,  // Parse .env
  formatBytes,  // Human-readable sizes
  hasTTY,       // Check TTY
  readJSON      // Safe JSON read
} from '@artifex/dev-cli';
```

## Debugging

```bash
# Enable debug output
DEBUG=1 node bin/dev-cli.js command

# Or use flag
node bin/dev-cli.js --debug command
```

## Next Steps

1. **Test existing commands** - Try `up`, `down`, `artisan`, `test`
2. **Add custom commands** - Create project-specific commands
3. **Iterate on config** - Adjust container names, paths, etc.
4. **Add more features** - Build out additional core commands
5. **Extract & publish** - Eventually publish as `@artifex/dev-cli` npm package

## Architecture Benefits

✅ **Discoverable** - IDE autocomplete for imports
✅ **Tree-shakeable** - Only bundle what you use
✅ **Testable** - Easy to mock imports
✅ **Type-safe** - Full TypeScript support
✅ **Clear separation** - Data vs behavior
✅ **Extensible** - Easy custom commands
✅ **Reusable** - One CLI for all projects

## Comparison with Current CLI

| Current | New |
|---------|-----|
| Hardcoded container names | Configurable via `cli.config.js` |
| Scrybe-specific | Framework agnostic |
| Single project | Reusable across projects |
| Inline logic | Import functions |
| Monolithic | Plugin architecture |

## Files to Review

- `src/core/config-loader.js` - Configuration loading & validation
- `src/core/context.js` - Context class (data only)
- `src/lib/docker.js` - Docker utilities (importable)
- `src/lib/output.js` - Output utilities (importable)
- `src/commands/frameworks/laravel.js` - Laravel commands
- `examples/laravel/cli.config.js` - Example configuration
- `examples/laravel/commands/rag.js` - Example custom command
