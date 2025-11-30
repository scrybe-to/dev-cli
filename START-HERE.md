# Start Here 🚀

## What We Built

A **generic, reusable Docker development CLI** that can be configured for any project.

**Key Innovation**: Separating data from behavior
- **Context** = configuration, container names, paths (data)
- **Imports** = all functions and utilities (behavior)

## Quick Test (2 minutes)

```bash
# 1. You're already in the right directory
cd /Users/peterbedorjr/code/artifex/scrybe/.dev/cli-new

# 2. Dependencies already installed ✅

# 3. See available commands
node bin/dev-cli.js --help

# 4. Try a command
node bin/dev-cli.js ps

# 5. Try Laravel command
node bin/dev-cli.js artisan --version
```

## ✅ What Works Now

### Docker Commands
- `up` - Start containers
- `down` - Stop containers
- `restart` - Restart containers
- `ps` - Container status
- `logs` - View logs
- `build` - Build containers
- `stats` - Resource usage

### Laravel Commands
- `artisan` - Run artisan commands
- `composer` - Run composer
- `tinker` - Open tinker REPL
- `test` - Run tests
- `pint` - Format code
- `migrate` - Run migrations
- `seed` - Run seeders
- `fresh` - Fresh migration
- `optimize` - Optimize Laravel
- `clear` - Clear caches

## Example: Adding a Custom Command

Create `my-command.js`:

```javascript
import { execContainer, status } from '@artifex/dev-cli';

export default {
  name: 'deploy',
  description: 'Deploy to staging',
  action: async (options, context) => {
    const { containers } = context;

    status.info('Deploying...');
    await execContainer(containers.app, 'php', ['artisan', 'deploy']);
    status.success('Deployed!');
  }
};
```

Add to `test-cli.config.js`:

```javascript
commands: {
  custom: ['./my-command.js']
}
```

Run it:

```bash
node bin/dev-cli.js deploy
```

## Configuration

Edit `test-cli.config.js`:

```javascript
export default {
  name: 'scrybe-new',
  framework: 'laravel',

  containers: {
    app: 'scrybe_app',
    database: 'scrybe_mysql',
    // ...
  },

  commands: {
    docker: true,      // Enable Docker commands
    framework: true,   // Enable Laravel commands
    custom: []         // Add your custom commands
  }
};
```

## Documentation

- **TESTING.md** - Comprehensive testing guide
- **DEVELOPMENT.md** - Development guide with API docs
- **QUICKSTART.md** - Quick start guide
- **README.md** - Architecture overview

## Benefits Over Current CLI

| Feature | Old CLI | New CLI |
|---------|---------|---------|
| Configuration | Hardcoded | Config file |
| Reusability | Scrybe only | Any project |
| Framework | Laravel only | Any framework |
| Extensibility | Fork & modify | Plugin system |
| Type Safety | None | Full TypeScript |
| Discoverability | Comments | IDE autocomplete |
| Testing | Hard to mock | Easy to mock |

## Architecture

```
Context (data only)           Imports (functions)
├── config                    ├── execContainer()
├── containers                ├── compose()
├── paths                     ├── status.info()
├── env                       ├── colors.cyan()
└── framework                 └── createSpinner()

Commands combine both:
context.containers.app  →  execContainer(...)
```

## What's Next?

1. **Test it** - Try commands with your Docker setup
2. **Add commands** - Port more from old CLI
3. **Refine** - Adjust based on feedback
4. **Iterate** - Fix issues, add features
5. **Eventually** - Replace old CLI
6. **Publish** - Release as npm package

## Questions to Answer Through Testing

1. ✅ Does the context/import split make sense?
2. ✅ Is configuration flexible enough?
3. ✅ Are custom commands easy to create?
4. ✅ Is the API discoverable?
5. ✅ Are error messages helpful?
6. ✅ Is debug mode useful?
7. ✅ Is performance acceptable?

## Debug Mode

```bash
DEBUG=1 node bin/dev-cli.js command
```

Shows:
- Config loading
- Commands loaded
- Docker commands executed

## Try It Now!

```bash
# See all commands
node bin/dev-cli.js --help

# Test Docker integration
node bin/dev-cli.js ps

# Test Laravel integration
node bin/dev-cli.js artisan list

# Enable debug mode
DEBUG=1 node bin/dev-cli.js --help
```

## File Structure

```
cli-new/
├── bin/dev-cli.js              ← Entry point
├── src/
│   ├── core/                   ← Core systems
│   ├── commands/               ← Command implementations
│   ├── lib/                    ← Utilities (importable)
│   └── index.js                ← Main exports
├── examples/                   ← Example configs & commands
├── test-cli.config.js          ← Test configuration
└── Documentation files
```

## Need Help?

- **TESTING.md** - Step-by-step testing guide
- **DEVELOPMENT.md** - API reference
- **examples/** - Working examples

---

**Ready to test?** Start with: `node bin/dev-cli.js --help`
