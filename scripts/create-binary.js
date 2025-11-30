#!/usr/bin/env node

/**
 * Post-build script to create the root binary wrapper
 *
 * This script:
 * 1. Reads cli.config.js to get the binary name
 * 2. Creates a wrapper script at project root
 * 3. Makes it executable
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createBinary() {
  try {
    // Load config to get binary name
    const configPath = path.resolve(process.cwd(), 'cli.config.js');

    if (!fs.existsSync(configPath)) {
      console.error('❌ No cli.config.js found in current directory');
      process.exit(1);
    }

    const configUrl = pathToFileURL(configPath).href;
    const { default: config } = await import(configUrl);

    const binaryName = config.name;

    // Calculate path from project root to dist file
    // cli-new is at: scrybe/.dev/cli-new/
    // binary goes to: scrybe/scrybe-new
    // So from binary, dist is: .dev/cli-new/dist/dev-cli.js
    const projectRoot = path.resolve(process.cwd(), '..', '..');

    // Find the built file in dist/ (should be only one .js file)
    const distDir = path.resolve(process.cwd(), 'dist');
    const distFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));

    if (distFiles.length === 0) {
      throw new Error('No built .js file found in dist/');
    }

    const distFile = distFiles[0];
    const distPath = path.relative(
      projectRoot,
      path.join(distDir, distFile)
    );

    // Calculate config path relative to binary
    const configPath = path.relative(
      projectRoot,
      path.resolve(process.cwd(), 'cli.config.js')
    );

    // Create binary wrapper content
    const binaryContent = `#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set config path for the CLI to find
process.env.CLI_CONFIG_PATH = resolve(__dirname, '${configPath}');

// Import the built CLI
import(join(__dirname, '${distPath}'));
`;

    // Write binary to project root
    const binaryPath = path.join(projectRoot, binaryName);
    fs.writeFileSync(binaryPath, binaryContent, { mode: 0o755 });

    console.log(`✅ Created binary: ${binaryPath}`);
    console.log(`   Usage: ./${binaryName} <command>`);
  } catch (error) {
    console.error('❌ Failed to create binary:', error.message);
    process.exit(1);
  }
}

createBinary();
