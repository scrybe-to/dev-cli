import { program } from 'commander';
import { loadConfig } from './config-loader.js';
import { createContext } from './context.js';
import { loadCommands, registerCommands } from './command-loader.js';
import { displaySimpleBanner, status, colors } from '../lib/output.js';
import { generateBanner } from '../lib/banner.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Build categorized help text from commands
 *
 * @param {Object[]} commands - Array of command definitions
 * @returns {string} Formatted help text
 */
function buildCategorizedHelp(commands) {
  // Group commands by category
  const categories = {};

  commands.forEach(cmd => {
    const category = cmd.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }

    // Build command display with aliases
    let commandDisplay = cmd.name;
    if (cmd.alias) {
      commandDisplay += `, ${cmd.alias}`;
    } else if (cmd.aliases && cmd.aliases.length > 0) {
      commandDisplay += `, ${cmd.aliases.join(', ')}`;
    }

    categories[category].push({
      name: commandDisplay,
      description: cmd.description || ''
    });
  });

  // Build help text
  let helpText = '\n';

  // Sort categories for consistent display
  const sortedCategories = Object.keys(categories).sort((a, b) => {
    // Define category order
    const order = ['Setup', 'Container', 'Laravel', 'Database', 'Frontend', 'System', 'Other'];
    const aIndex = order.findIndex(o => a.includes(o));
    const bIndex = order.findIndex(o => b.includes(o));

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  sortedCategories.forEach(category => {
    helpText += `${colors.bold(colors.magenta(category + ':'))}\n`;

    categories[category].forEach(cmd => {
      const paddedName = cmd.name.padEnd(25);
      helpText += `  ${colors.cyan(paddedName)}${colors.dim(cmd.description)}\n`;
    });

    helpText += '\n';
  });

  return helpText;
}

/**
 * Create and configure the CLI application
 *
 * @param {Object} options - CLI options
 * @returns {Promise<Object>} Commander program instance
 */
export async function createCLI(options = {}) {
  try {
    // Load configuration
    const config = await loadConfig(options.configPath);

    // Create context (data only)
    const context = createContext(config, {
      debug: options.debug,
      verbose: options.verbose,
    });

    // Pre-generate banner if enabled (figlet is async)
    let bannerText = '';
    if (config.branding.banner && config.branding.asciiBanner) {
      const bannerConfig = {
        font: config.branding.asciiBanner.font || 'Standard',
        color: config.branding.asciiBanner.color || 'cyan',
        gradient: config.branding.asciiBanner.gradient || false,
        gradientColors: config.branding.asciiBanner.gradientColors || ['#667eea', '#764ba2'],
        tagline: config.description,
        version: config.version,
      };

      // Generate banner upfront
      const banner = await generateBanner(
        config.branding.asciiBanner.text || config.name,
        bannerConfig
      );

      bannerText = '\n' + banner;
      if (config.description) {
        bannerText += '\n' + colors.dim('  ' + config.description);
      }
      if (config.version) {
        bannerText += '\n' + colors.dim('  v' + config.version);
      }
      bannerText += '\n';
    }

    // Configure Commander program
    // Use binaryName for usage, fall back to name
    const displayName = config.binaryName || config.name;

    program
      .name(displayName)
      .version(config.version)
      .description(config.description || 'Docker Development Environment CLI')
      .configureHelp({
        sortSubcommands: false,
        subcommandTerm: (cmd) => colors.cyan(cmd.name()),
        commandUsage: (cmd) => colors.teal(cmd.name()) + ' ' + colors.dim(cmd.usage()),
        optionTerm: (option) => colors.magenta(option.flags),
        optionDescription: (option) => option.description,
        visibleCommands: () => [], // Hide default Commands section (we build our own)
      });

    // Display banner if enabled
    if (config.branding.banner) {
      if (bannerText) {
        // Use pre-generated banner
        program.addHelpText('beforeAll', bannerText);
      } else {
        // Fall back to simple banner
        program.addHelpText('beforeAll', () => {
          displaySimpleBanner(config.name, config.version);
          return '';
        });
      }
    }

    // Load commands (core + custom)
    const coreCommandsPath = path.join(__dirname, '..', 'commands');
    const commands = await loadCommands(config, coreCommandsPath);

    // Build categorized help text
    const categorizedHelp = buildCategorizedHelp(commands);
    if (categorizedHelp) {
      program.addHelpText('after', categorizedHelp);
    }

    // Register commands with context
    registerCommands(program, commands, context);

    // Custom error handling
    program.exitOverride();

    // Store context on program for access if needed
    program._context = context;

    return program;
  } catch (error) {
    status.error(error.message);

    if (process.env.DEBUG === '1') {
      console.error(error);
    }

    process.exit(1);
  }
}

/**
 * Run the CLI with arguments
 *
 * @param {string[]} argv - Command line arguments
 * @param {Object} options - CLI options
 */
export async function runCLI(argv = process.argv, options = {}) {
  const cli = await createCLI(options);

  try {
    await cli.parseAsync(argv);
  } catch (error) {
    if (error.code === 'commander.unknownCommand') {
      const commandName = error.message.split("'")[1];
      console.error(`${colors.red('Error:')} Unknown command '${commandName}'`);
      console.log(`Run '${cli.name()} --help' for usage information`);
      process.exit(1);
    } else if (error.code === 'commander.help' || error.code === 'commander.helpDisplayed') {
      // Help was displayed, exit normally
      process.exit(0);
    } else {
      console.error(`${colors.red('Error:')} ${error.message}`);

      if (process.env.DEBUG === '1') {
        console.error(error);
      }

      process.exit(1);
    }
  }
}
