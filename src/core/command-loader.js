import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import { status, colors } from '../lib/output.js';
import { getPluginManager } from './plugin-manager.js';

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

    // Validation helper - commands need name and either action or subcommands
    const isValidCommand = (cmd) => {
      if (!cmd.name) return false;
      // Commands with subcommands don't need an action
      if (cmd.subcommands && Array.isArray(cmd.subcommands)) return true;
      return !!cmd.action;
    };

    // If it's an array of commands, return the array
    if (Array.isArray(commandDef)) {
      return commandDef.filter(cmd => {
        if (!isValidCommand(cmd)) {
          console.warn(
            colors.yellow(`⚠ Invalid command in ${filePath}: missing name or action/subcommands`)
          );
          return false;
        }
        return true;
      });
    }

    // Single command object
    if (!isValidCommand(commandDef)) {
      console.warn(
        colors.yellow(`⚠ Invalid command structure in ${filePath}: missing name or action/subcommands`)
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
  const commandConfig = config.commands || {};

  // Always load core commands (init, etc.)
  const coreCommands = await loadCommandsFromDirectory(
    path.join(coreCommandsPath, 'core')
  );
  commands.push(...coreCommands);

  // Load Docker commands if enabled and using docker execution mode
  if (commandConfig.docker !== false && config.execution?.mode === 'docker') {
    const dockerCommands = await loadCommandsFromDirectory(
      path.join(coreCommandsPath, 'docker')
    );
    commands.push(...dockerCommands);
  }

  // Load database commands if enabled and database is configured
  if (commandConfig.database !== false && config.database?.driver !== 'none') {
    const dbCommands = await loadCommandsFromDirectory(
      path.join(coreCommandsPath, 'database')
    );
    commands.push(...dbCommands);
  }

  // Load system commands if enabled
  if (commandConfig.system !== false) {
    const systemCommands = await loadCommandsFromDirectory(
      path.join(coreCommandsPath, 'system')
    );
    commands.push(...systemCommands);
  }

  // Load storage commands if enabled
  if (commandConfig.storage !== false && config.storage?.driver !== 'none') {
    const storageCommands = await loadCommandsFromDirectory(
      path.join(coreCommandsPath, 'storage')
    );
    commands.push(...storageCommands);
  }

  return commands;
}

/**
 * Load plugin commands
 *
 * @param {Object} config - CLI configuration
 * @returns {Promise<Object[]>} Array of command definitions
 */
async function loadPluginCommands(config) {
  const commands = [];
  const enabledPlugins = config.plugins?.enabled || [];

  if (enabledPlugins.length === 0) {
    return commands;
  }

  const pluginManager = getPluginManager();

  // Load all enabled plugins
  await pluginManager.loadPlugins(enabledPlugins);

  // Get commands from each loaded plugin
  for (const pluginName of enabledPlugins) {
    try {
      const pluginCommands = await pluginManager.getCommands(pluginName);

      if (Array.isArray(pluginCommands)) {
        // Filter and validate commands
        const validCommands = pluginCommands.filter(cmd => {
          if (!cmd.name || !cmd.action) {
            console.warn(
              colors.yellow(`⚠ Invalid command in plugin "${pluginName}": missing name or action`)
            );
            return false;
          }
          return true;
        });

        commands.push(...validCommands);

        if (process.env.DEBUG === '1') {
          status.debug(`Loaded ${validCommands.length} commands from plugin "${pluginName}"`);
        }
      }
    } catch (error) {
      console.warn(
        colors.yellow(`⚠ Failed to load commands from plugin "${pluginName}": ${error.message}`)
      );
    }
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
  const customPaths = config.commands?.custom || [];
  const commands = [];

  for (const customPath of customPaths) {
    // Resolve relative to project root
    const absolutePath = path.resolve(config.paths?.projectRoot || process.cwd(), customPath);

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
 * Load all commands (core + plugins + custom)
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

  // Load plugin commands
  if (process.env.DEBUG === '1') {
    status.debug('Loading plugin commands...');
  }
  const pluginCommands = await loadPluginCommands(config);
  commands.push(...pluginCommands);

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
 * Register a single command (or subcommand) with Commander
 *
 * @param {Object} parentCommand - Commander command instance to attach to
 * @param {Object} commandDef - Command definition
 * @param {Object} context - Context instance
 * @param {Object} pluginManager - Plugin manager instance
 */
function registerSingleCommand(parentCommand, commandDef, context, pluginManager) {
  const command = parentCommand
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

  // Handle subcommands recursively
  if (commandDef.subcommands && Array.isArray(commandDef.subcommands)) {
    for (const subcommandDef of commandDef.subcommands) {
      registerSingleCommand(command, subcommandDef, context, pluginManager);
    }
    // Don't set an action on parent commands with subcommands - let Commander show help
    return command;
  }

  // Set action handler with context and plugin hooks
  command.action(async (...args) => {
    try {
      // Last arg is the command object from Commander, options are second to last
      const options = args[args.length - 2] || {};
      const commandArgs = args.slice(0, -2);

      // Run beforeCommand hooks from plugins
      await pluginManager.runHook('beforeCommand', context, commandDef);

      // Execute the command
      const result = await commandDef.action(options, context, ...commandArgs);

      // Run afterCommand hooks from plugins
      await pluginManager.runHook('afterCommand', context, commandDef, result);

      return result;
    } catch (error) {
      if (process.env.DEBUG === '1') {
        console.error(error);
      }
      status.error(error.message || 'Command failed');
      process.exit(1);
    }
  });

  return command;
}

/**
 * Register commands with Commander program
 *
 * @param {Object} program - Commander program instance
 * @param {Object[]} commands - Array of command definitions
 * @param {Object} context - Context instance
 */
export function registerCommands(program, commands, context) {
  const pluginManager = getPluginManager();

  for (const commandDef of commands) {
    registerSingleCommand(program, commandDef, context, pluginManager);
  }

  if (process.env.DEBUG === '1') {
    status.debug(`Registered ${commands.length} commands with Commander`);
  }
}
