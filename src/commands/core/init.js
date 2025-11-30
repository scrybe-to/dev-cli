/**
 * Init Command
 *
 * Interactive setup wizard for configuring the CLI
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { status, colors } from '../../lib/output.js';
import { generateBinary, addNpmScript } from '../../lib/binary-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect framework from project files
 *
 * @param {string} projectRoot - Project root directory
 * @returns {string|null} Detected framework or null
 */
function detectFramework(projectRoot) {
  if (existsSync(join(projectRoot, 'composer.json'))) {
    try {
      const composerJson = JSON.parse(readFileSync(join(projectRoot, 'composer.json'), 'utf8'));
      if (composerJson.require && composerJson.require['laravel/framework']) {
        return 'laravel';
      }
      if (composerJson.require && composerJson.require['symfony/symfony']) {
        return 'symfony';
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  if (existsSync(join(projectRoot, 'requirements.txt'))) {
    const content = readFileSync(join(projectRoot, 'requirements.txt'), 'utf8');
    if (content.includes('Django')) {
      return 'django';
    }
  }

  return null;
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
 * Update cli.config.js with new values
 *
 * @param {string} configPath - Path to config file
 * @param {Object} updates - Values to update
 */
function updateConfig(configPath, updates) {
  let content = readFileSync(configPath, 'utf8');

  // Split content into lines for more precise replacement
  const lines = content.split('\n');

  // Track nesting level to only replace top-level properties
  let nestingLevel = 0;
  let inExport = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track when we enter the export default object
    if (line.includes('export default {')) {
      inExport = true;
      nestingLevel = 1;
      continue;
    }

    if (!inExport) continue;

    // Track nesting level
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    nestingLevel += openBraces - closeBraces;

    // Only process top-level properties (nestingLevel === 1, before any braces on this line)
    const effectiveNesting = nestingLevel - openBraces;

    // Check each update key
    for (const [key, value] of Object.entries(updates)) {
      // Match top-level property (with optional comment before it)
      const propRegex = new RegExp(`^(\\s*)(//.*\\n\\s*)?${key}:\\s*`);

      if (effectiveNesting === 1 && propRegex.test(line)) {
        // Handle different value types
        let replacement;
        if (typeof value === 'string') {
          replacement = `'${value}'`;
        } else if (typeof value === 'boolean') {
          replacement = value.toString();
        } else {
          replacement = JSON.stringify(value);
        }

        // Replace the value keeping the indentation
        lines[i] = line.replace(/:\s*[^,\n]+/, `: ${replacement}`);
      }
    }
  }

  writeFileSync(configPath, lines.join('\n'), 'utf8');
}

/**
 * Init command - Interactive setup wizard
 */
export const init = {
  name: 'init',
  category: 'Setup',
  description: 'Initialize and configure the CLI for your project',
  options: [
    { flags: '--skip-binary', description: 'Skip custom binary generation' }
  ],
  action: async (options, context) => {
    const projectRoot = process.cwd();
    const configPath = join(projectRoot, 'cli.config.js');

    console.log(colors.bold(colors.cyan('\n🚀 CLI Setup Wizard\n')));

    if (!existsSync(configPath)) {
      status.error('cli.config.js not found. Run npm install first.');
      process.exit(1);
    }

    const rl = createInterface({ input, output });

    try {
      // Get suggested values
      const suggestedName = getSuggestedName(projectRoot);
      const detectedFramework = detectFramework(projectRoot);

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
        colors.cyan('? Binary name (leave blank to use project name)'),
        ''
      );

      // Validate binary name if provided
      if (binaryName && !/^[a-z0-9-_]+$/i.test(binaryName)) {
        status.error('Binary name must contain only letters, numbers, hyphens, and underscores');
        process.exit(1);
      }

      // Prompt for description
      const description = await prompt(
        rl,
        colors.cyan('? Description'),
        `Development CLI for ${projectName}`
      );

      // Confirm detected framework or ask
      let framework = detectedFramework;
      if (detectedFramework) {
        console.log(colors.green(`✓ Detected framework: ${detectedFramework}`));
        const useDetected = await prompt(
          rl,
          colors.cyan('? Use detected framework? (y/n)'),
          'y'
        );
        if (useDetected.toLowerCase() !== 'y') {
          framework = await prompt(
            rl,
            colors.cyan('? Framework (laravel/rails/django/express/custom)'),
            'custom'
          );
        }
      } else {
        framework = await prompt(
          rl,
          colors.cyan('? Framework (laravel/rails/django/express/custom)'),
          'custom'
        );
      }

      // Update configuration
      status.info('Updating configuration...');
      const updates = {
        name: projectName,
        description: description,
        framework: framework,
      };

      // Only add binaryName if it's different from projectName
      if (binaryName && binaryName !== projectName) {
        updates.binaryName = binaryName;
      }

      updateConfig(configPath, updates);

      status.success('Configuration updated');

      // Generate custom binary
      if (!options.skipBinary) {
        // Use binaryName if specified, otherwise use projectName
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

            console.log(colors.green('\n✨ Setup complete!\n'));
            console.log('You can now run:');
            console.log(colors.cyan(`  ./${actualBinaryName} --help`));
            console.log(colors.cyan(`  npm run ${actualBinaryName} --help`));
            console.log(colors.cyan(`  npx dev-cli --help\n`));
          } catch (error) {
            status.error(`Failed to generate binary: ${error.message}`);
            if (process.env.DEBUG === '1') {
              console.error(error);
            }
          }
        } else {
          console.log(colors.green('\n✨ Setup complete!\n'));
          console.log('You can run:');
          console.log(colors.cyan(`  npx dev-cli --help\n`));
        }
      } else {
        console.log(colors.green('\n✨ Setup complete!\n'));
        console.log('You can run:');
        console.log(colors.cyan(`  npx dev-cli --help\n`));
      }

    } catch (error) {
      status.error(`Setup failed: ${error.message}`);
      process.exit(1);
    } finally {
      rl.close();
    }
  }
};

export default [init];
