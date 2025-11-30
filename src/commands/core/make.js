/**
 * Make Commands
 *
 * Scaffold new commands and other CLI components
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { status, colors } from '../../lib/output.js';
import { loadCommands } from '../../core/command-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert name to various formats
 */
function formatName(name) {
  // Remove .js extension if provided
  const baseName = name.replace(/\.js$/, '');

  // Convert to kebab-case for filename
  const kebab = baseName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

  // Convert to PascalCase for comments
  const pascal = baseName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  return { kebab, pascal, original: baseName };
}

/**
 * Get commands directory from config or use default
 */
function getCommandsDir(context) {
  const projectRoot = context.config?.paths?.projectRoot || process.cwd();

  // Check if user has a custom commands path in config
  const customPaths = context.config?.commands?.custom || [];
  if (customPaths.length > 0) {
    // Extract directory from first custom command path
    const firstPath = customPaths[0];
    const dir = firstPath.split('/').slice(0, -1).join('/') || 'commands';
    return join(projectRoot, dir);
  }

  // Default to 'commands' at project root
  return join(projectRoot, 'commands');
}

/**
 * Command template
 */
function getCommandTemplate(name, options) {
  const { pascal } = formatName(name);

  return `/**
 * ${pascal} Command
 *
 * ${options.description || 'Project command for ' + pascal.toLowerCase()}
 */

import { status, colors } from '@artifex/dev-cli/lib';

/**
 * ${pascal} command
 */
export const ${name.replace(/-/g, '')} = {
  // Command name - how users will invoke it
  name: '${name}',

  // Category for help menu grouping
  category: 'Project',

  // Short description shown in help
  description: '${options.description || 'Description of what this command does'}',

  // Command arguments (optional)
  // arguments: [
  //   { name: '<required-arg>', description: 'A required argument' },
  //   { name: '[optional-arg]', description: 'An optional argument', defaultValue: 'default' },
  // ],

  // Command options/flags (optional)
  options: [
    { flags: '-f, --force', description: 'Force the operation' },
    { flags: '-v, --verbose', description: 'Verbose output' },
  ],

  // Allow unknown options to pass through (useful for wrapper commands)
  // allowUnknownOption: true,

  /**
   * Command action
   *
   * @param {Object} options - Parsed command options/flags
   * @param {Object} context - CLI context (config, containers, paths, etc.)
   * @param {string[]} variadicArgs - Variadic arguments (if using [args...])
   */
  action: async (options, context, variadicArgs) => {
    // Access configuration
    const { config, containers, paths } = context;

    status.info('Running ${pascal} command...');

    if (options.verbose) {
      console.log(colors.dim('Verbose mode enabled'));
    }

    // Example: Execute command in container
    // const { execContainer } = await import('@artifex/dev-cli/lib/docker');
    // await execContainer(containers.app, 'php', ['artisan', 'cache:clear']);

    // Example: Run docker compose
    // const { compose } = await import('@artifex/dev-cli/lib/docker');
    // await compose(paths.composeFile, paths.envFile, ['exec', 'app', 'bash']);

    // Example: Access variadic arguments (if using [args...] in name)
    // const commandArgs = Array.isArray(variadicArgs) ? variadicArgs : [];
    // const [firstArg, secondArg] = commandArgs;
    // console.log(\`Arguments: \${firstArg}, \${secondArg}\`);

    // Your command logic here
    console.log('');
    console.log(colors.cyan('✨ ${pascal} command executed successfully!'));
    console.log('');

    // Example: Show helpful info
    console.log(colors.dim('Tip: Add your custom logic in commands/${name}.js'));
    console.log('');

    status.success('Done!');
  }
};

// Export all commands (can have multiple in one file)
export default [${name.replace(/-/g, '')}];
`;
}

/**
 * Make command
 */
export const makeCommand = {
  name: 'make:command',
  category: 'Scaffolding',
  description: 'Create a new custom command',
  arguments: [
    { name: '<name>', description: 'Command name (e.g., deploy, sync-db)' },
  ],
  options: [
    { flags: '-d, --description <desc>', description: 'Command description' },
    { flags: '--dir <directory>', description: 'Custom directory (default: commands/)' },
    { flags: '--force', description: 'Overwrite if exists' },
  ],
  action: async (options, context, name) => {
    if (!name) {
      status.error('Command name is required');
      console.log('');
      console.log('Usage: make:command <name>');
      console.log('Example: make:command deploy');
      console.log('');
      process.exit(1);
    }

    const { kebab } = formatName(name);

    // Load all existing commands to check for conflicts
    try {
      const coreCommandsPath = join(__dirname, '..', '..', 'commands');
      const existingCommands = await loadCommands(context.config, coreCommandsPath);

      // Check if command already exists
      const existingCommand = existingCommands.find(cmd => {
        // Check main name and all aliases
        const names = [cmd.name];
        if (cmd.alias) names.push(cmd.alias);
        if (cmd.aliases) names.push(...cmd.aliases);

        return names.some(n => n === kebab || n.split(' ')[0] === kebab);
      });

      if (existingCommand) {
        status.error(`Command '${kebab}' already exists!`);
        console.log('');
        console.log(colors.yellow('Existing command details:'));
        console.log(colors.dim(`  Name: ${existingCommand.name}`));
        console.log(colors.dim(`  Category: ${existingCommand.category || 'N/A'}`));
        console.log(colors.dim(`  Description: ${existingCommand.description || 'N/A'}`));
        console.log('');
        console.log('Choose a different name or use --force to override (not recommended)');
        console.log('');
        process.exit(1);
      }
    } catch (error) {
      // If we can't load commands, warn but continue
      if (process.env.DEBUG === '1') {
        console.warn(colors.yellow(`Warning: Could not check for existing commands: ${error.message}`));
      }
    }
    const commandsDir = options.dir
      ? join(process.cwd(), options.dir)
      : getCommandsDir(context);
    const filename = `${kebab}.js`;
    const filepath = join(commandsDir, filename);

    // Check if file exists
    if (existsSync(filepath) && !options.force) {
      status.error(`Command already exists: ${filepath}`);
      console.log('');
      console.log(colors.yellow('Use --force to overwrite'));
      console.log('');
      process.exit(1);
    }

    // Create directory if it doesn't exist
    if (!existsSync(commandsDir)) {
      mkdirSync(commandsDir, { recursive: true });
      status.success(`Created directory: ${commandsDir}`);
    }

    // Generate command file
    const template = getCommandTemplate(kebab, options);
    writeFileSync(filepath, template, 'utf8');

    status.success(`Created command: ${filepath}`);
    console.log('');

    // Update config if needed
    const configPath = join(context.config?.paths?.projectRoot || process.cwd(), 'cli.config.js');
    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf8');
      const relativeCommandPath = `./${commandsDir.replace(process.cwd() + '/', '')}/${filename}`;

      // Check if this path is already in config
      if (!configContent.includes(relativeCommandPath)) {
        console.log(colors.yellow('📝 Add this to your cli.config.js:'));
        console.log('');
        console.log(colors.cyan('commands: {'));
        console.log(colors.cyan('  ...'));
        console.log(colors.cyan(`  custom: [`));
        console.log(colors.cyan(`    '${relativeCommandPath}',`));
        console.log(colors.cyan(`  ],`));
        console.log(colors.cyan('},'));
        console.log('');
      }
    }

    console.log(colors.green('✨ Command created successfully!'));
    console.log('');
    console.log('Next steps:');
    console.log(colors.dim(`  1. Edit the command: ${filepath}`));
    console.log(colors.dim(`  2. Add to cli.config.js custom commands array`));
    const binaryName = context.config?.binaryName || context.config?.name || 'dev-cli';
    console.log(colors.dim(`  3. Run: ${binaryName} ${kebab} --help`));
    console.log('');
  }
};

/**
 * List commands
 */
export const listCommands = {
  name: 'make:list',
  category: 'Scaffolding',
  description: 'List all custom commands in your project',
  action: async (options, context) => {
    const commandsDir = getCommandsDir(context);

    if (!existsSync(commandsDir)) {
      console.log(colors.yellow('No commands directory found'));
      console.log('');
      console.log(colors.dim(`Expected: ${commandsDir}`));
      console.log('');
      console.log('Create your first command:');
      console.log(colors.cyan('  make:command my-command'));
      console.log('');
      return;
    }

    const { readdirSync } = await import('fs');
    const files = readdirSync(commandsDir)
      .filter(f => f.endsWith('.js'))
      .sort();

    if (files.length === 0) {
      console.log(colors.yellow('No commands found'));
      console.log('');
      console.log('Create your first command:');
      console.log(colors.cyan('  make:command my-command'));
      console.log('');
      return;
    }

    console.log('');
    console.log(colors.bold(colors.cyan('Custom Commands:')));
    console.log('');

    files.forEach(file => {
      const relativePath = `./${commandsDir.replace(process.cwd() + '/', '')}/${file}`;
      console.log(colors.cyan(`  ${file.padEnd(30)}`), colors.dim(relativePath));
    });

    console.log('');
    console.log(colors.dim(`Location: ${commandsDir}`));
    console.log('');
  }
};

export default [makeCommand, listCommands];
