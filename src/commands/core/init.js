/**
 * Init Command
 *
 * Interactive setup wizard for configuring the CLI with the new config format.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { status, colors } from '../../lib/output.js';
import { generateBinary, addNpmScript } from '../../lib/binary-generator.js';
import { getDefaultConfig, generateConfigFileContent } from '../../core/config-loader.js';
import { getPluginManager } from '../../core/plugin-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect framework/plugin from project files
 *
 * @param {string} projectRoot - Project root directory
 * @returns {string|null} Detected plugin or null
 */
function detectPlugin(projectRoot) {
  // Laravel detection
  if (existsSync(join(projectRoot, 'composer.json'))) {
    try {
      const composerJson = JSON.parse(readFileSync(join(projectRoot, 'composer.json'), 'utf8'));
      if (composerJson.require && composerJson.require['laravel/framework']) {
        return 'laravel';
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // Django detection
  if (existsSync(join(projectRoot, 'requirements.txt'))) {
    const content = readFileSync(join(projectRoot, 'requirements.txt'), 'utf8');
    if (content.toLowerCase().includes('django')) {
      return 'django';
    }
  }

  if (existsSync(join(projectRoot, 'manage.py'))) {
    return 'django';
  }

  // Rails detection
  if (existsSync(join(projectRoot, 'Gemfile'))) {
    const content = readFileSync(join(projectRoot, 'Gemfile'), 'utf8');
    if (content.includes('rails')) {
      return 'rails';
    }
  }

  // Express/Node detection
  if (existsSync(join(projectRoot, 'package.json'))) {
    try {
      const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.express) {
        return 'express';
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  return null;
}

/**
 * Detect database from project files
 *
 * @param {string} projectRoot - Project root directory
 * @returns {string} Detected database driver
 */
function detectDatabase(projectRoot) {
  // Check .env file
  const envPath = join(projectRoot, '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    if (content.includes('DB_CONNECTION=mysql') || content.includes('DB_DRIVER=mysql')) {
      return 'mysql';
    }
    if (content.includes('DB_CONNECTION=pgsql') || content.includes('DB_DRIVER=postgres')) {
      return 'postgres';
    }
    if (content.includes('DB_CONNECTION=sqlite') || content.includes('DB_DRIVER=sqlite')) {
      return 'sqlite';
    }
  }

  // Check docker-compose for database services
  const composePaths = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
  for (const composePath of composePaths) {
    if (existsSync(join(projectRoot, composePath))) {
      const content = readFileSync(join(projectRoot, composePath), 'utf8');
      if (content.includes('mysql') || content.includes('mariadb')) {
        return 'mysql';
      }
      if (content.includes('postgres')) {
        return 'postgres';
      }
    }
  }

  return 'none';
}

/**
 * Detect execution mode from project
 *
 * @param {string} projectRoot - Project root directory
 * @returns {string} Execution mode
 */
function detectExecutionMode(projectRoot) {
  const composePaths = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
  for (const composePath of composePaths) {
    if (existsSync(join(projectRoot, composePath))) {
      return 'docker';
    }
  }
  return 'native';
}

/**
 * Get project name from package.json or directory name
 *
 * @param {string} projectRoot - Project root directory
 * @returns {string} Suggested project name
 */
function getSuggestedName(projectRoot) {
  const packageJsonPath = join(projectRoot, 'package.json');

  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.name) {
        // Remove scope if present (@scope/name -> name)
        return packageJson.name.replace(/^@[\w-]+\//, '');
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // Fallback to directory name
  return projectRoot.split('/').pop() || 'my-project';
}

/**
 * Prompt user for input with default value
 *
 * @param {Object} rl - Readline interface
 * @param {string} question - Question to ask
 * @param {string} defaultValue - Default value
 * @returns {Promise<string>} User's answer
 */
async function prompt(rl, question, defaultValue = '') {
  const defaultHint = defaultValue ? colors.dim(` (${defaultValue})`) : '';
  const answer = await rl.question(question + defaultHint + ': ');
  return answer.trim() || defaultValue;
}

/**
 * Prompt user for selection from choices
 *
 * @param {Object} rl - Readline interface
 * @param {string} question - Question to ask
 * @param {string[]} choices - Available choices
 * @param {string} defaultValue - Default value
 * @returns {Promise<string>} User's answer
 */
async function promptSelect(rl, question, choices, defaultValue = '') {
  console.log(colors.dim(`  Options: ${choices.join(', ')}`));
  return prompt(rl, question, defaultValue);
}

/**
 * Init command - Interactive setup wizard
 */
export const init = {
  name: 'init',
  category: 'Setup',
  description: 'Initialize and configure the CLI for your project',
  options: [
    { flags: '--skip-binary', description: 'Skip custom binary generation' },
    { flags: '--force', description: 'Overwrite existing configuration' }
  ],
  action: async (options) => {
    const projectRoot = process.cwd();
    const configPath = join(projectRoot, 'cli.config.js');

    console.log(colors.bold(colors.cyan('\n  CLI Setup Wizard\n')));

    // Check for existing config
    if (existsSync(configPath) && !options.force) {
      status.warning('cli.config.js already exists');
      console.log(colors.dim('  Use --force to overwrite'));
      console.log('');
      return;
    }

    const rl = createInterface({ input, output });

    try {
      // Detect project settings
      const suggestedName = getSuggestedName(projectRoot);
      const detectedPlugin = detectPlugin(projectRoot);
      const detectedDatabase = detectDatabase(projectRoot);
      const detectedMode = detectExecutionMode(projectRoot);

      // Show detections
      console.log(colors.bold('Detected settings:'));
      console.log(`  Execution mode: ${colors.cyan(detectedMode)}`);
      if (detectedPlugin) {
        console.log(`  Framework: ${colors.cyan(detectedPlugin)}`);
      }
      console.log(`  Database: ${colors.cyan(detectedDatabase)}`);
      console.log('');

      // Prompt for project name
      const projectName = await prompt(
        rl,
        colors.cyan('? Project name'),
        suggestedName
      );

      // Validate project name
      if (!/^[a-z0-9-_]+$/i.test(projectName)) {
        status.error('Project name must contain only letters, numbers, hyphens, and underscores');
        process.exit(1);
      }

      // Prompt for binary name
      const binaryName = await prompt(
        rl,
        colors.cyan('? Binary name (command to run)'),
        projectName
      );

      // Validate binary name
      if (!/^[a-z0-9-_]+$/i.test(binaryName)) {
        status.error('Binary name must contain only letters, numbers, hyphens, and underscores');
        process.exit(1);
      }

      // Prompt for description
      const description = await prompt(
        rl,
        colors.cyan('? Description'),
        `Development CLI for ${projectName}`
      );

      // Prompt for execution mode
      const executionMode = await promptSelect(
        rl,
        colors.cyan('? Execution mode'),
        ['docker', 'native', 'ssh'],
        detectedMode
      );

      // Prompt for database
      const databaseDriver = await promptSelect(
        rl,
        colors.cyan('? Database'),
        ['mysql', 'postgres', 'sqlite', 'none'],
        detectedDatabase
      );

      // Prompt for plugins
      const pluginManager = getPluginManager();
      const availablePlugins = await pluginManager.listAvailable();
      let enabledPlugins = [];

      if (availablePlugins.length > 0) {
        console.log(colors.dim(`  Available plugins: ${availablePlugins.join(', ')}`));

        if (detectedPlugin && availablePlugins.includes(detectedPlugin)) {
          const useDetected = await prompt(
            rl,
            colors.cyan(`? Enable ${detectedPlugin} plugin? (y/n)`),
            'y'
          );
          if (useDetected.toLowerCase() === 'y') {
            enabledPlugins.push(detectedPlugin);
          }
        } else {
          const pluginAnswer = await prompt(
            rl,
            colors.cyan('? Enable plugins (comma-separated, or "none")'),
            'none'
          );
          if (pluginAnswer && pluginAnswer.toLowerCase() !== 'none') {
            enabledPlugins = pluginAnswer.split(',').map(p => p.trim()).filter(Boolean);
          }
        }
      }

      // Generate configuration
      status.info('Generating configuration...');

      const config = getDefaultConfig({
        name: projectName,
        executionMode: executionMode,
        databaseDriver: databaseDriver,
        plugins: enabledPlugins,
      });

      // Update with user inputs
      config.description = description;
      if (binaryName !== projectName) {
        config.binaryName = binaryName;
      }
      config.branding.asciiBanner.text = projectName.toUpperCase();

      // Write configuration file
      const configContent = generateConfigFileContent(config);
      writeFileSync(configPath, configContent, 'utf8');

      status.success('Configuration created: cli.config.js');

      // Generate custom binary
      if (!options.skipBinary) {
        const actualBinaryName = binaryName || projectName;

        const createBinary = await prompt(
          rl,
          colors.cyan(`? Create custom binary '${actualBinaryName}'? (y/n)`),
          'y'
        );

        if (createBinary.toLowerCase() === 'y') {
          status.info('Generating custom binary...');

          // Find package root (go up from src/commands/core to package root)
          const packageRoot = join(__dirname, '..', '..', '..');

          try {
            const binaryPath = generateBinary(projectRoot, actualBinaryName, packageRoot);
            status.success(`Binary created: ${binaryPath}`);

            // Add npm script
            const scriptAdded = addNpmScript(projectRoot, actualBinaryName, binaryPath);
            if (scriptAdded) {
              status.success(`Added script to package.json: npm run ${actualBinaryName}`);
            }

            console.log(colors.green('\n  Setup complete!\n'));
            console.log('You can now run:');
            console.log(colors.cyan(`  ./${actualBinaryName} --help`));
            console.log(colors.cyan(`  npm run ${actualBinaryName} --help`));
            console.log('');
          } catch (error) {
            status.error(`Failed to generate binary: ${error.message}`);
            if (process.env.DEBUG === '1') {
              console.error(error);
            }
          }
        } else {
          console.log(colors.green('\n  Setup complete!\n'));
          console.log('You can run:');
          console.log(colors.cyan(`  npx dev-cli --help\n`));
        }
      } else {
        console.log(colors.green('\n  Setup complete!\n'));
        console.log('You can run:');
        console.log(colors.cyan(`  npx dev-cli --help\n`));
      }

    } catch (error) {
      status.error(`Setup failed: ${error.message}`);
      if (process.env.DEBUG === '1') {
        console.error(error);
      }
      process.exit(1);
    } finally {
      rl.close();
    }
  }
};

export default [init];
