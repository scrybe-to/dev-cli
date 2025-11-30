# Testing Guide

## Setup Complete! ✅

The new CLI is ready to test. Here's how to use it:

## Current Status

From `.dev/cli-new` directory:

```bash
# Already installed dependencies
npm install  # ✅ Done

# Config file created
test-cli.config.js  # ✅ Done (symlinked to cli.config.js)
```

## Available Commands

### 🐳 Docker Commands
```bash
node bin/dev-cli.js up              # Start containers
node bin/dev-cli.js down            # Stop containers
node bin/dev-cli.js restart         # Restart containers
node bin/dev-cli.js ps              # Show container status
node bin/dev-cli.js logs -f         # Follow logs
node bin/dev-cli.js build           # Build containers
node bin/dev-cli.js stats           # Resource usage
```

### 🚀 Laravel Commands
```bash
node bin/dev-cli.js artisan list    # List artisan commands
node bin/dev-cli.js composer --version  # Composer version
node bin/dev-cli.js tinker          # Open tinker REPL
node bin/dev-cli.js test            # Run tests
node bin/dev-cli.js pint            # Format code
node bin/dev-cli.js migrate         # Run migrations
node bin/dev-cli.js seed            # Run seeders
node bin/dev-cli.js fresh           # Fresh migration with seeds
node bin/dev-cli.js optimize        # Optimize Laravel
node bin/dev-cli.js clear           # Clear caches
```

## Test Scenarios

### 1. Basic Docker Operations

```bash
# Check if Docker is running
node bin/dev-cli.js ps

# Expected: Shows list of running containers or starts them
```

### 2. Laravel Commands

```bash
# Run artisan (passthrough arguments)
node bin/dev-cli.js artisan --version

# Expected: Shows Laravel version
```

### 3. Help System

```bash
# Global help
node bin/dev-cli.js --help

# Command help
node bin/dev-cli.js artisan --help
node bin/dev-cli.js up --help
```

### 4. Debug Mode

```bash
# Enable debug output
DEBUG=1 node bin/dev-cli.js up

# Shows:
# - Config loading
# - Command loading
# - Docker commands being executed
```

## Testing Custom Commands

### 1. Enable the RAG Example

Edit `test-cli.config.js`:

```javascript
commands: {
  // ...
  custom: [
    './examples/laravel/commands/rag.js',  // Add this
  ]
}
```

### 2. Test Custom Command

```bash
node bin/dev-cli.js --help  # Should show rag:index, rag:search, rag:status

node bin/dev-cli.js rag:status
```

### 3. Create Your Own Command

Create `test-command.js`:

```javascript
import { status, colors } from '@artifex/dev-cli';

export default {
  name: 'hello',
  description: 'Test custom command',
  action: async (options, context) => {
    status.info('Hello from custom command!');
    console.log(colors.cyan('Containers:'), Object.keys(context.containers));
    console.log(colors.cyan('Framework:'), context.config.framework);
  }
};
```

Add to config:

```javascript
custom: ['./test-command.js']
```

Test it:

```bash
node bin/dev-cli.js hello
```

## Comparing with Old CLI

### Old CLI (from project root):
```bash
scrybe up
scrybe artisan migrate
scrybe test
```

### New CLI (from .dev/cli-new):
```bash
node bin/dev-cli.js up
node bin/dev-cli.js artisan migrate
node bin/dev-cli.js test
```

## What to Test

### ✅ Core Functionality
- [ ] Docker commands work with your containers
- [ ] Laravel commands execute in the correct container
- [ ] Passthrough arguments work (e.g., `artisan list`)
- [ ] Help system displays correctly
- [ ] Error messages are clear

### ✅ Configuration
- [ ] Container names map correctly
- [ ] Paths are resolved properly
- [ ] Config validation catches errors
- [ ] Custom commands load

### ✅ Developer Experience
- [ ] Commands are discoverable
- [ ] Output is clear and formatted
- [ ] Debug mode is helpful
- [ ] Error messages are actionable

## Known Limitations

1. **Not all commands ported yet** - Only Docker and Laravel commands
2. **No database commands** - Need to port from old CLI
3. **No frontend commands** - Need to port npm/vite commands
4. **No system commands** - hosts, doctor, etc. not ported yet

## Next Steps After Testing

1. **Report Issues** - What doesn't work?
2. **Port More Commands** - Which commands are most important?
3. **Refine API** - Is the context/import pattern working well?
4. **Add Features** - What's missing?
5. **Performance** - Is command loading fast enough?

## Feedback Questions

As you test, consider:

1. Is the **context** (data only) approach working?
2. Are **imports** (functions) easy to discover and use?
3. Is **configuration** clear and flexible enough?
4. Is **command structure** intuitive?
5. Are **error messages** helpful?
6. Is **debug mode** useful?
7. Do **custom commands** feel natural to create?

## Troubleshooting

### Config Not Found

```bash
# Make sure you're in cli-new directory
cd .dev/cli-new

# Check symlink
ls -la cli.config.js
```

### Docker Errors

```bash
# The CLI checks if Docker is running
# Make sure Docker Desktop is running first
```

### Import Errors

```bash
# If you see "Cannot find module" errors:
# 1. Check file paths in imports
# 2. Make sure using .js extensions
# 3. Check that functions are exported
```

### Command Not Found

```bash
# Enable debug to see which commands loaded
DEBUG=1 node bin/dev-cli.js --help
```

## Success Criteria

The new CLI is ready for migration when:

- ✅ All core commands work
- ✅ Custom commands are easy to add
- ✅ Configuration is flexible
- ✅ Error handling is robust
- ✅ Performance is acceptable
- ✅ Developer experience is improved

## Moving Forward

Once tested and refined:

1. Port remaining commands from old CLI
2. Update documentation
3. Create migration guide
4. Eventually replace old CLI
5. Publish as npm package
