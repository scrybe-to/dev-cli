/**
 * Install Command
 *
 * Install the custom binary globally so it's accessible from anywhere
 */

import { existsSync, symlinkSync, unlinkSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { status, colors } from '../../lib/output.js';

/**
 * Get the best installation path based on what's available and writable
 */
function getInstallPath() {
  const paths = [
    '/usr/local/bin',
    join(homedir(), '.local', 'bin'),
    join(homedir(), 'bin'),
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      try {
        // Test if we can write to this directory
        const testFile = join(path, '.test-write-' + Date.now());
        symlinkSync(__filename, testFile);
        unlinkSync(testFile);
        return path;
      } catch (e) {
        // Can't write to this path, try next
        continue;
      }
    }
  }

  // Fallback to ~/.local/bin (we'll create it)
  return join(homedir(), '.local', 'bin');
}

/**
 * Install command
 */
export const install = {
  name: 'install',
  category: 'Setup',
  description: 'Install binary globally (adds to PATH)',
  options: [
    { flags: '--path <path>', description: 'Custom installation path (default: auto-detect)' },
    { flags: '--force', description: 'Overwrite existing symlink' },
  ],
  action: async (options, context) => {
    // Use current directory if context doesn't have config
    const projectRoot = context.config?.paths?.projectRoot || process.cwd();

    // Try to determine the binary name from multiple sources
    // 1. First, try the actual running binary's name (from process.argv[1])
    const { basename } = await import('path');
    const runningBinaryName = basename(process.argv[1]);

    // 2. Use binaryName from config if specified
    const configBinaryName = context.config?.binaryName;

    // 3. Fall back to name from config
    const configName = context.config?.name;

    // Build list of possible binary names to check
    const possibleNames = [
      runningBinaryName,
      configBinaryName,
      configName,
      'cli'
    ].filter(Boolean); // Remove undefined/null values

    // Try to find the binary in project root
    let binaryPath = null;
    let binaryName = null;

    for (const name of possibleNames) {
      const testPath = join(projectRoot, name);
      if (existsSync(testPath)) {
        binaryPath = testPath;
        binaryName = name;
        break;
      }
    }

    // Check if binary exists
    if (!binaryPath) {
      status.error(`Binary not found in: ${projectRoot}`);
      console.log('');
      console.log('Tried the following names:');
      possibleNames.forEach(name => {
        console.log(colors.dim(`  - ${name}`));
      });
      console.log('');
      console.log(colors.yellow('Tip: Run "init" first to create your custom binary'));
      console.log('');
      process.exit(1);
    }

    // Make sure binary is executable
    try {
      chmodSync(binaryPath, '755');
    } catch (error) {
      status.warning(`Could not make binary executable: ${error.message}`);
    }

    // Determine installation path
    const installDir = options.path || getInstallPath();
    const symlinkPath = join(installDir, binaryName);

    // Create install directory if it doesn't exist
    if (!existsSync(installDir)) {
      try {
        const { mkdirSync } = await import('fs');
        mkdirSync(installDir, { recursive: true });
        status.success(`Created directory: ${installDir}`);
      } catch (error) {
        status.error(`Failed to create directory: ${error.message}`);
        process.exit(1);
      }
    }

    // Check if symlink already exists
    if (existsSync(symlinkPath)) {
      if (options.force) {
        try {
          unlinkSync(symlinkPath);
          status.info('Removed existing symlink');
        } catch (error) {
          status.error(`Failed to remove existing symlink: ${error.message}`);
          process.exit(1);
        }
      } else {
        status.error(`Symlink already exists: ${symlinkPath}`);
        console.log('');
        console.log(colors.yellow('Use --force to overwrite'));
        console.log('');
        process.exit(1);
      }
    }

    // Create symlink
    try {
      symlinkSync(binaryPath, symlinkPath);
      status.success(`Installed: ${binaryName} → ${symlinkPath}`);
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        status.error(`Permission denied. Try running with sudo:`);
        console.log('');
        console.log(colors.cyan(`  sudo ./${binaryName} install`));
        console.log('');
        process.exit(1);
      }

      status.error(`Failed to create symlink: ${error.message}`);
      process.exit(1);
    }

    console.log('');
    console.log(colors.green('✨ Installation complete!'));
    console.log('');
    console.log('You can now run:');
    console.log(colors.cyan(`  ${binaryName} --help`));
    console.log('');

    // Check if the install directory is in PATH
    const pathEnv = process.env.PATH || '';
    if (!pathEnv.split(':').includes(installDir)) {
      console.log(colors.yellow('⚠️  Note: The install directory is not in your PATH'));
      console.log('');
      console.log('Add this to your shell profile (~/.zshrc, ~/.bashrc, etc.):');
      console.log(colors.dim(`  export PATH="${installDir}:$PATH"`));
      console.log('');
      console.log('Then reload your shell:');
      console.log(colors.dim('  source ~/.zshrc'));
      console.log('');
    }
  }
};

/**
 * Uninstall command
 */
export const uninstall = {
  name: 'uninstall',
  category: 'Setup',
  description: 'Uninstall binary from PATH',
  options: [
    { flags: '--path <path>', description: 'Custom installation path (default: auto-detect)' },
  ],
  action: async (options, context) => {
    const installDir = options.path || getInstallPath();

    // Try to determine the binary name from multiple sources
    // 1. First, try the actual running binary's name (from process.argv[1])
    const { basename } = await import('path');
    const runningBinaryName = basename(process.argv[1]);

    // 2. Use binaryName from config if specified
    const configBinaryName = context.config?.binaryName;

    // 3. Fall back to name from config
    const configName = context.config?.name;

    // Build list of possible binary names to check
    const possibleNames = [
      runningBinaryName,
      configBinaryName,
      configName,
      'cli'
    ].filter(Boolean); // Remove undefined/null values

    // Try to find the installed binary
    let symlinkPath = null;
    let binaryName = null;

    for (const name of possibleNames) {
      const testPath = join(installDir, name);
      if (existsSync(testPath)) {
        symlinkPath = testPath;
        binaryName = name;
        break;
      }
    }

    if (!symlinkPath) {
      status.error(`Binary not found in: ${installDir}`);
      console.log('');
      console.log('Tried the following names:');
      possibleNames.forEach(name => {
        console.log(colors.dim(`  - ${name}`));
      });
      console.log('');
      process.exit(1);
    }

    // Remove symlink
    try {
      unlinkSync(symlinkPath);
      status.success(`Uninstalled: ${symlinkPath}`);
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        status.error(`Permission denied. Try running with sudo:`);
        console.log('');
        console.log(colors.cyan(`  sudo ${binaryName} uninstall`));
        console.log('');
        process.exit(1);
      }

      status.error(`Failed to remove symlink: ${error.message}`);
      process.exit(1);
    }

    console.log('');
    console.log(colors.green('✨ Uninstallation complete!'));
    console.log('');
  }
};

export default [install, uninstall];
