import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import { status, colors } from '../lib/output.js';

/**
 * Load a command module from a file path
 *
 * @param {string} filePath - Absolute path to command file
 * @returns {Promise<Object[]>} Array of command definitions
 */
async function loadCommandModule(filePath) {
  try {
    const fileUrl = pathToFileURL(filePath).href;
    const module = await import(fileUrl);

    // Support both default export and named exports
    const commandDef = module.default || module;

    // If it's an array of commands, return the array
    if (Array.isArray(commandDef)) {
      return commandDef.filter(cmd => {
        if (!cmd.name || !cmd.action) {
          console.warn(
            colors.yellow(`⚠ Invalid command in ${filePath}: missing name or action`)
          );
          return false;
        }
        return true;
      });
    }

    // Single command object
    if (!commandDef.name || !commandDef.action) {
      console.warn(
        colors.yellow(`⚠ Invalid command structure in ${filePath}: missing name or action`)
      );
      return [];
    }

    return [commandDef];
  } catch (error) {
    console.warn(
      colors.yellow(`⚠ Failed to load command from ${filePath}: ${error.message}`)
    );
    return [];
  }
}

/**
 * Load all commands from a directory
 *
 * @param {string} dirPath - Directory containing command files
 * @param {boolean} recursive - Load commands recursively
 * @returns {Promise<Object[]>} Array of command definitions
 */
async function loadCommandsFromDirectory(dirPath, recursive = true) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const commands = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && recursive) {
      // Recursively load from subdirectories
      const subCommands = await loadCommandsFromDirectory(fullPath, recursive);
      commands.push(...subCommands);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const loadedCommands = await loadCommandModule(fullPath);
      commands.push(...loadedCommands);
    }
  }

  return commands;
}

/**
 * Load core commands based on configuration
 *
 * @param {Object} config - CLI configuration
 * @param {string} coreCommandsPath - Path to core commands directory
 * @returns {Promise<Object[]>} Array of command definitions
 */
async function loadCoreCommands(config, coreCommandsPath) {
  const commands = [];
  const commandConfig = config.commands;

  // Always load core commands (init, etc.)
  const coreCommands = await loadCommandsFromDirectory(
    path.join(coreCommandsPath, 'core')
  );
  commands.push(...coreCommands);

  // Load Docker commands
  if (commandConfig.docker) {
    const dockerCommands = await loadCommandsFromDirectory(
      path.join(coreCommandsPath, 'docker')
    );
    commands.push(...dockerCommands);
  }

  // Load framework-specific commands
  if (commandConfig.framework && config.framework) {
    const frameworkPath = path.join(coreCommandsPath, 'frameworks', config.framework);
    const frameworkCommands = await loadCommandsFromDirectory(frameworkPath);
    commands.push(...frameworkCommands);
  }

  // Load database commands
  if (commandConfig.database) {
    const dbCommands = await loadCommandsFromDirectory(
      path.join(coreCommandsPath, 'database')
    );
    commands.push(...dbCommands);
  }

  // Load frontend commands
  if (commandConfig.frontend) {
    const frontendCommands = await loadCommandsFromDirectory(
      path.join(coreCommandsPath, 'frontend')
    );
    commands.push(...frontendCommands);
  }

  // Load system commands
  if (commandConfig.system) {
    const systemCommands = await loadCommandsFromDirectory(
      path.join(coreCommandsPath, 'system')
    );
    commands.push(...systemCommands);
  }

  // Load storage commands
  if (commandConfig.storage) {
    const storageCommands = await loadCommandsFromDirectory(
      path.join(coreCommandsPath, 'storage')
    );
    commands.push(...storageCommands);
  }

  return commands;
}

/**
 * Load custom commands from project
 *
 * @param {Object} config - CLI configuration
 * @returns {Promise<Object[]>} Array of command definitions
 */
async function loadCustomCommands(config) {
  const customPaths = config.commands.custom || [];
  const commands = [];

  for (const customPath of customPaths) {
    // Resolve relative to project root
    const absolutePath = path.resolve(config.paths.projectRoot, customPath);

    if (fs.existsSync(absolutePath)) {
      const stat = fs.statSync(absolutePath);

      if (stat.isDirectory()) {
        const dirCommands = await loadCommandsFromDirectory(absolutePath);
        commands.push(...dirCommands);
      } else if (stat.isFile()) {
        const loadedCommands = await loadCommandModule(absolutePath);
        commands.push(...loadedCommands);
      }
    } else {
      console.warn(
        colors.yellow(`⚠ Custom command path not found: ${absolutePath}`)
      );
    }
  }

  return commands;
}

/**
 * Load all commands (core + custom)
 *
 * @param {Object} config - CLI configuration
 * @param {string} coreCommandsPath - Path to core commands directory
 * @returns {Promise<Object[]>} Array of all command definitions
 */
export async function loadCommands(config, coreCommandsPath) {
  const commands = [];

  // Load core commands
  if (process.env.DEBUG === '1') {
    status.debug('Loading core commands...');
  }
  const coreCommands = await loadCoreCommands(config, coreCommandsPath);
  commands.push(...coreCommands);

  // Load custom commands
  if (process.env.DEBUG === '1') {
    status.debug('Loading custom commands...');
  }
  const customCommands = await loadCustomCommands(config);
  commands.push(...customCommands);

  if (process.env.DEBUG === '1') {
    status.debug(`Loaded ${commands.length} commands total`);
  }

  return commands;
}

/**
 * Register commands with Commander program
 *
 * @param {Object} program - Commander program instance
 * @param {Object[]} commands - Array of command definitions
 * @param {Object} context - Context instance
 */
export function registerCommands(program, commands, context) {
  for (const commandDef of commands) {
    const command = program
      .command(commandDef.name)
      .description(commandDef.description || '');

    // Add aliases
    if (commandDef.alias) {
      command.alias(commandDef.alias);
    }
    if (commandDef.aliases && Array.isArray(commandDef.aliases)) {
      commandDef.aliases.forEach(alias => command.alias(alias));
    }

    // Add arguments
    if (commandDef.arguments) {
      commandDef.arguments.forEach(arg => {
        command.argument(arg.name, arg.description, arg.defaultValue);
      });
    }

    // Add options
    if (commandDef.options) {
      commandDef.options.forEach(opt => {
        command.option(opt.flags, opt.description, opt.defaultValue);
      });
    }

    // Allow unknown options for passthrough commands
    if (commandDef.allowUnknownOption) {
      command.allowUnknownOption();
    }

    // Set action handler with context
    command.action(async (...args) => {
      try {
        // Last arg is the command object from Commander, options are second to last
        const options = args[args.length - 2] || {};
        const commandArgs = args.slice(0, -2);

        await commandDef.action(options, context, ...commandArgs);
      } catch (error) {
        if (process.env.DEBUG === '1') {
          console.error(error);
        }
        status.error(error.message || 'Command failed');
        process.exit(1);
      }
    });
  }

  if (process.env.DEBUG === '1') {
    status.debug(`Registered ${commands.length} commands with Commander`);
  }
}
