/**
 * Docker Helper Commands
 *
 * Utility commands to help with Docker configuration
 */

import { execa } from 'execa';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { status, colors } from '../../lib/output.js';

/**
 * Detect container type from name
 */
function detectContainerType(name) {
  const nameLower = name.toLowerCase();

  // Database containers (check first as they're more specific)
  if (nameLower.includes('mysql') || nameLower.includes('mariadb')) return 'database';
  if (nameLower.includes('postgres') || nameLower.includes('psql')) return 'database';
  if (nameLower.includes('mongo')) return 'database';

  // Cache/Queue
  if (nameLower.includes('redis')) return 'redis';
  if (nameLower.includes('memcache')) return 'cache';

  // Web servers
  if (nameLower.includes('nginx')) return 'webserver';
  if (nameLower.includes('apache')) return 'webserver';
  if (nameLower.includes('caddy')) return 'webserver';

  // Queue workers (check before app to be more specific)
  if (nameLower.includes('queue') || nameLower.includes('worker')) return 'queue';
  if (nameLower.includes('horizon')) return 'queue';

  // Scheduler/Cron
  if (nameLower.includes('scheduler') || nameLower.includes('cron')) return 'scheduler';

  // Storage
  if (nameLower.includes('minio') || nameLower.includes('s3')) return 'storage';

  // Search
  if (nameLower.includes('elastic') || nameLower.includes('opensearch')) return 'search';
  if (nameLower.includes('meilisearch') || nameLower.includes('algolia')) return 'search';

  // Mail
  if (nameLower.includes('mail') || nameLower.includes('smtp')) return 'mail';
  if (nameLower.includes('mailpit') || nameLower.includes('mailhog')) return 'mail';

  // Application (check last as it's most generic)
  // Include framework names that indicate the main app container
  if (nameLower.includes('laravel')) return 'app';
  if (nameLower.includes('symfony')) return 'app';
  if (nameLower.includes('django')) return 'app';
  if (nameLower.includes('rails')) return 'app';
  if (nameLower.includes('app') || nameLower.includes('web')) return 'app';
  if (nameLower.includes('php')) return 'app';
  if (nameLower.includes('node')) return 'app';

  return 'container';
}

/**
 * Get running containers
 */
async function getRunningContainers() {
  try {
    const { stdout } = await execa('docker', [
      'ps',
      '--format',
      '{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'
    ]);

    return stdout.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, image, status, ports] = line.split('|');
        return {
          name: name.trim(),
          image: image.trim(),
          status: status.trim(),
          ports: ports.trim(),
          suggestedAlias: detectContainerType(name)
        };
      });
  } catch (error) {
    throw new Error('Failed to get running containers. Is Docker running?');
  }
}

/**
 * Detect indentation from existing file
 */
function detectIndentation(content) {
  // Look for existing indentation in the containers block
  const containerMatch = content.match(/containers:\s*\{[\s\S]*?\n(\s+)\w+:/);
  if (containerMatch && containerMatch[1]) {
    return containerMatch[1];
  }

  // Fall back to detecting general indentation
  const indentMatch = content.match(/\n(\s+)\w+:/);
  if (indentMatch && indentMatch[1]) {
    return indentMatch[1];
  }

  // Default to 2 spaces
  return '  ';
}

/**
 * Update config file with container mappings
 */
function updateConfigContainers(configPath, containers) {
  let content = readFileSync(configPath, 'utf8');

  // Detect existing indentation
  const indent = detectIndentation(content);

  // Build the containers object string with detected indentation
  const containerLines = Object.entries(containers)
    .map(([alias, name]) => `${indent}${indent}${alias}: '${name}',`)
    .join('\n');

  const containersBlock = `containers: {\n${containerLines}\n${indent}}`;

  // Try to replace existing containers block
  const containersRegex = /containers:\s*\{[^}]*\}/s;
  if (containersRegex.test(content)) {
    content = content.replace(containersRegex, containersBlock);
  } else {
    // If not found, warn user
    throw new Error('Could not find containers block in config');
  }

  writeFileSync(configPath, content, 'utf8');
}

/**
 * Map containers command
 */
export const mapContainers = {
  name: 'containers:map',
  category: 'Setup',
  description: 'Map running Docker containers to config aliases',
  options: [
    { flags: '--apply', description: 'Automatically update cli.config.js' },
  ],
  action: async (options, context) => {
    status.info('Scanning running Docker containers...');
    console.log('');

    const containers = await getRunningContainers();

    if (containers.length === 0) {
      status.warning('No running containers found');
      console.log('');
      console.log(colors.dim('Start your containers with:'));
      console.log(colors.cyan('  docker compose up -d'));
      console.log('');
      return;
    }

    // Group by suggested alias
    const aliasMap = {};
    const usedAliases = new Set();

    containers.forEach(container => {
      let alias = container.suggestedAlias;

      // Handle duplicates
      if (usedAliases.has(alias)) {
        // Try adding a number
        let counter = 2;
        while (usedAliases.has(`${alias}${counter}`)) {
          counter++;
        }
        alias = `${alias}${counter}`;
      }

      usedAliases.add(alias);
      aliasMap[alias] = container.name;
    });

    // Display the containers with suggested mappings
    console.log(colors.bold(colors.cyan('Running Containers:\n')));

    const maxAliasLength = Math.max(...Object.keys(aliasMap).map(a => a.length));
    const maxNameLength = Math.max(...containers.map(c => c.name.length));

    Object.entries(aliasMap).forEach(([alias, name]) => {
      const container = containers.find(c => c.name === name);
      const aliasColored = colors.green(alias.padEnd(maxAliasLength));
      const nameColored = colors.cyan(name.padEnd(maxNameLength));
      const imageColored = colors.dim(container.image);

      console.log(`  ${aliasColored} → ${nameColored}  ${imageColored}`);
    });

    console.log('');

    // Show the config snippet
    console.log(colors.bold(colors.yellow('Suggested Configuration:\n')));
    console.log(colors.cyan('containers: {'));
    Object.entries(aliasMap).forEach(([alias, name]) => {
      console.log(colors.cyan(`  ${alias}: '${name}',`));
    });
    console.log(colors.cyan('},'));
    console.log('');

    // Apply automatically if requested
    if (options.apply) {
      const configPath = join(process.cwd(), 'cli.config.js');

      if (!existsSync(configPath)) {
        status.error('cli.config.js not found in current directory');
        return;
      }

      try {
        updateConfigContainers(configPath, aliasMap);
        status.success('Updated cli.config.js with container mappings');
        console.log('');
        console.log(colors.dim('Review your config and adjust aliases as needed'));
        console.log('');
      } catch (error) {
        status.error(`Failed to update config: ${error.message}`);
        console.log('');
        console.log(colors.yellow('Copy the configuration above manually'));
        console.log('');
      }
    } else {
      console.log(colors.dim('Copy the configuration above to your cli.config.js'));
      console.log(colors.dim('Or run with --apply to update automatically'));
      console.log('');
    }

    // Show usage tip
    console.log(colors.bold('Usage Tip:'));
    console.log(colors.dim('After updating your config, you can use these aliases:'));
    Object.keys(aliasMap).slice(0, 3).forEach(alias => {
      console.log(colors.cyan(`  mc exec ${alias} bash`));
    });
    console.log('');
  }
};

/**
 * List containers command
 */
export const listContainers = {
  name: 'containers:list',
  category: 'Container Management',
  description: 'List configured container aliases',
  action: async (options, context) => {
    const { containers } = context;

    if (!containers || Object.keys(containers).length === 0) {
      status.warning('No containers configured');
      console.log('');
      console.log('Run this to map your containers:');
      console.log(colors.cyan('  mc containers:map'));
      console.log('');
      return;
    }

    console.log('');
    console.log(colors.bold(colors.cyan('Configured Containers:\n')));

    const maxAliasLength = Math.max(...Object.keys(containers).map(a => a.length));

    for (const [alias, name] of Object.entries(containers)) {
      const aliasColored = colors.green(alias.padEnd(maxAliasLength));
      const nameColored = colors.cyan(name);

      // Check if container is running
      try {
        const { stdout } = await execa('docker', ['ps', '--filter', `name=^${name}$`, '--format', '{{.Status}}'], { stdio: 'pipe' });
        const isRunning = stdout.trim().length > 0;
        const statusIcon = isRunning ? colors.green('✓') : colors.dim('○');
        const statusText = isRunning ? colors.dim(stdout.trim()) : colors.dim('not running');

        console.log(`  ${statusIcon} ${aliasColored} → ${nameColored}  ${statusText}`);
      } catch (error) {
        console.log(`  ${colors.dim('?')} ${aliasColored} → ${nameColored}  ${colors.dim('unknown')}`);
      }
    }

    console.log('');
  }
};

export default [mapContainers, listContainers];
