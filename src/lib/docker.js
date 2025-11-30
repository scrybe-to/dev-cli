import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import { status, colors } from './output.js';
import { getTTYFlags } from './utils.js';

/**
 * Find Docker Compose file from common variants
 *
 * @param {string} projectRoot - Project root directory
 * @param {string} preferredFile - Preferred compose file path (optional)
 * @returns {string|null} Path to compose file or null if not found
 */
export function findComposeFile(projectRoot, preferredFile = null) {
  // If a preferred file is specified and exists, use it
  if (preferredFile && fs.existsSync(preferredFile)) {
    return preferredFile;
  }

  // Common Docker Compose file variants (in priority order)
  const variants = [
    'compose.yaml',
    'compose.yml',
    'docker-compose.yaml',
    'docker-compose.yml',
  ];

  for (const variant of variants) {
    const filePath = path.join(projectRoot, variant);
    if (fs.existsSync(filePath)) {
      if (process.env.DEBUG === '1') {
        console.log(colors.dim(`Found compose file: ${variant}`));
      }
      return filePath;
    }
  }

  return null;
}

/**
 * Check if Docker is running
 *
 * @returns {Promise<boolean>}
 * @throws {Error} If Docker is not running
 */
export async function checkDocker() {
  try {
    await execa('docker', ['info'], { stdio: 'pipe' });
    return true;
  } catch (error) {
    status.error('Docker is not running!');
    console.log('');
    status.info('Please start Docker Desktop and try again.');
    console.log('');
    console.log('Platform-specific instructions:');
    console.log('  macOS: Open Docker from Applications or run: open -a Docker');
    console.log('  Linux: Run: sudo systemctl start docker');
    console.log('  WSL2:  Make sure Docker Desktop is running on Windows');
    throw new Error('Docker is not running');
  }
}

/**
 * Check if specific containers are running
 *
 * @param {string[]} containerNames - Container names to check
 * @returns {Promise<boolean>}
 * @throws {Error} If containers are not running
 */
export async function checkContainers(containerNames = []) {
  try {
    const { stdout } = await execa('docker', ['ps', '--format', '{{.Names}}'], {
      stdio: 'pipe'
    });

    const runningContainers = stdout.split('\n').filter(name => name.trim());

    const missingContainers = containerNames.filter(
      name => !runningContainers.includes(name)
    );

    if (missingContainers.length > 0) {
      status.error(`Containers not running: ${missingContainers.join(', ')}`);
      console.log(`${colors.dim('Try: ')}dev-cli up${colors.dim(' first')}`);
      throw new Error('Required containers are not running');
    }

    return true;
  } catch (error) {
    if (error.message.includes('Required containers')) {
      throw error;
    }
    status.error('Failed to check container status');
    throw error;
  }
}

/**
 * Execute command in a container
 *
 * @param {string} container - Container name
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execa result
 */
export async function execContainer(container, command, args = [], options = {}) {
  await checkDocker();

  const hasCustomIO = 'stdin' in options || 'stdout' in options ||
    'stderr' in options || 'input' in options || 'stdio' in options;

  const ttyFlags = hasCustomIO ? ['-i'] : getTTYFlags();
  const execArgs = ['exec', ...ttyFlags, container, command, ...args];

  if (process.env.DEBUG === '1') {
    console.log(colors.dim(`$ docker ${execArgs.join(' ')}`));
  }

  const execaOptions = {
    ...(hasCustomIO ? {} : { stdio: 'inherit' }),
    ...options,
  };

  return execa('docker', execArgs, execaOptions);
}

/**
 * Run docker compose command
 *
 * @param {string} composeFile - Path to docker-compose.yml
 * @param {string} envFile - Path to .env file
 * @param {string[]} args - Compose command arguments
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execa result
 */
export async function compose(composeFile, envFile, args = [], options = {}) {
  await checkDocker();

  // Try to find compose file if the specified one doesn't exist
  let actualComposeFile = composeFile;
  if (!fs.existsSync(composeFile)) {
    const projectRoot = path.dirname(composeFile);
    actualComposeFile = findComposeFile(projectRoot);

    if (!actualComposeFile) {
      status.error(`No Docker Compose file found in ${projectRoot}`);
      console.log('');
      console.log(colors.dim('Looked for:'));
      console.log(colors.dim('  - compose.yaml'));
      console.log(colors.dim('  - compose.yml'));
      console.log(colors.dim('  - docker-compose.yaml'));
      console.log(colors.dim('  - docker-compose.yml'));
      console.log('');
      throw new Error('Compose file not found');
    }
  }

  const composeArgs = ['compose'];

  // Add env file if it exists
  if (envFile && fs.existsSync(envFile)) {
    composeArgs.push('--env-file', envFile);
    if (process.env.DEBUG === '1') {
      console.log(colors.dim(`Using .env file: ${envFile}`));
    }
  }

  composeArgs.push('-f', actualComposeFile, ...args);

  if (process.env.DEBUG === '1') {
    console.log(colors.dim(`$ docker ${composeArgs.join(' ')}`));
  }

  return execa('docker', composeArgs, {
    stdio: options.stdio || 'inherit',
    ...options
  });
}

/**
 * Get list of running containers with optional name filter
 *
 * @param {string} nameFilter - Filter containers by name pattern
 * @returns {Promise<string[]>} Array of container names
 */
export async function getRunningContainers(nameFilter = '') {
  try {
    const args = ['ps', '--format', '{{.Names}}'];

    if (nameFilter) {
      args.push('--filter', `name=${nameFilter}`);
    }

    const { stdout } = await execa('docker', args, { stdio: 'pipe' });

    return stdout.trim().split('\n').filter(name => name.trim());
  } catch (error) {
    return [];
  }
}

/**
 * Get container stats
 *
 * @param {string[]} containers - Container names (empty for all)
 * @returns {Promise<string>} Stats output
 */
export async function getContainerStats(containers = []) {
  const args = [
    'stats',
    '--no-stream',
    '--format',
    'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'
  ];

  if (containers.length > 0) {
    args.push(...containers);
  }

  const { stdout } = await execa('docker', args, { stdio: 'pipe' });
  return stdout;
}

/**
 * Get Docker system disk usage
 *
 * @returns {Promise<string>} Disk usage output
 */
export async function getDockerDiskUsage() {
  const { stdout } = await execa('docker', [
    'system', 'df', '--format', 'table'
  ], { stdio: 'pipe' });

  return stdout;
}

/**
 * Helper wrapper to ensure Docker is running before executing commands
 *
 * @param {Function} fn - Async function to execute
 * @returns {Promise<any>} Result of function
 */
export async function withDocker(fn) {
  await checkDocker();
  return fn();
}
