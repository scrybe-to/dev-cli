#!/usr/bin/env node

/**
 * Post-install script for @artifex/dev-cli
 *
 * This script runs after the package is installed and:
 * 1. Creates a default cli.config.js in the user's project root
 * 2. Makes the binary executable
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine the target directory (where the package is installed)
// If we're being installed as a dependency, we want the parent project's root
const packageRoot = join(__dirname, '..');
const installRoot = process.env.INIT_CWD || process.cwd();

// Only run setup if we're being installed in a different project
// (not if we're in development or running npm install in the package itself)
const isProjectInstall = installRoot !== packageRoot;

if (!isProjectInstall) {
  console.log('📦 Running in package development mode, skipping postinstall setup');
  process.exit(0);
}

console.log('🚀 Setting up @artifex/dev-cli...\n');

// 1. Create default cli.config.js if it doesn't exist
const configPath = join(installRoot, 'cli.config.js');
const configExists = existsSync(configPath);

if (!configExists) {
  try {
    const templatePath = join(packageRoot, 'templates', 'cli.config.default.js');
    const template = readFileSync(templatePath, 'utf8');
    writeFileSync(configPath, template, 'utf8');
    console.log('✅ Created cli.config.js');
  } catch (error) {
    console.warn('⚠️  Could not create cli.config.js:', error.message);
  }
} else {
  console.log('ℹ️  cli.config.js already exists, skipping');
}

// 2. Ensure binary is executable
const binPath = join(packageRoot, 'bin', 'dev-cli.js');
try {
  if (existsSync(binPath)) {
    chmodSync(binPath, '755');
    console.log('✅ Made binary executable');
  }
} catch (error) {
  console.warn('⚠️  Could not make binary executable:', error.message);
}

console.log('\n✨ Setup complete!');
console.log('\n📝 Next steps:');
console.log('   1. Run "npx dev-cli init" to configure your project');
console.log('   2. Customize cli.config.js as needed');
console.log('   3. Run your custom CLI!\n');
