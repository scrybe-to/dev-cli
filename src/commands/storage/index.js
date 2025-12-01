/**
 * Storage Commands
 *
 * Commands for managing object storage using the storage provider pattern.
 * Supports filesystem, S3, and MinIO backends.
 */

import { status, colors } from '../../lib/output.js';

/**
 * List storage buckets/directories
 */
export const list = {
  name: 'storage:list [path]',
  category: 'Storage',
  description: 'List files and directories in storage',
  options: [
    { flags: '-l, --long', description: 'Show detailed listing' }
  ],
  action: async (options, context, path = '') => {
    const provider = context.getStorageProvider();

    if (!provider) {
      status.error('Storage is not configured');
      console.log('');
      console.log(colors.dim('Configure storage in cli.config.js:'));
      console.log(colors.dim('  storage: {'));
      console.log(colors.dim('    driver: "filesystem", // or "s3", "minio"'));
      console.log(colors.dim('    filesystem: { basePath: "./storage" }'));
      console.log(colors.dim('  }'));
      console.log('');
      return;
    }

    status.info(`Listing: ${path || '/'}`);
    console.log('');

    try {
      const items = await provider.list(path);

      if (items.length === 0) {
        console.log(colors.dim('  (empty)'));
      } else if (options.long) {
        for (const item of items) {
          const typeIcon = item.isDirectory ? colors.cyan('d') : colors.dim('-');
          const size = item.isDirectory ? colors.dim('-') : formatSize(item.size);
          const modified = item.modified ? new Date(item.modified).toLocaleString() : '';
          console.log(`  ${typeIcon} ${size.padStart(10)}  ${colors.dim(modified.padEnd(20))}  ${item.name}`);
        }
      } else {
        for (const item of items) {
          const icon = item.isDirectory ? colors.cyan('📁') : colors.dim('📄');
          console.log(`  ${icon} ${item.name}`);
        }
      }

      console.log('');
    } catch (error) {
      status.error('Failed to list storage');
      throw error;
    }
  }
};

/**
 * Upload file to storage
 */
export const upload = {
  name: 'storage:upload <local> <remote>',
  category: 'Storage',
  description: 'Upload file to storage',
  action: async (options, context, local, remote) => {
    const provider = context.getStorageProvider();

    if (!provider) {
      status.error('Storage is not configured');
      return;
    }

    if (!local || !remote) {
      status.error('Both local and remote paths are required');
      console.log('');
      console.log('Usage: storage:upload <local-path> <remote-path>');
      console.log('Example: storage:upload ./myfile.txt uploads/myfile.txt');
      console.log('');
      return;
    }

    status.info(`Uploading ${local} to ${remote}...`);

    try {
      await provider.upload(local, remote);
      status.success('File uploaded');
    } catch (error) {
      status.error('Failed to upload file');
      throw error;
    }
  }
};

/**
 * Download file from storage
 */
export const download = {
  name: 'storage:download <remote> <local>',
  category: 'Storage',
  description: 'Download file from storage',
  action: async (options, context, remote, local) => {
    const provider = context.getStorageProvider();

    if (!provider) {
      status.error('Storage is not configured');
      return;
    }

    if (!remote || !local) {
      status.error('Both remote and local paths are required');
      console.log('');
      console.log('Usage: storage:download <remote-path> <local-path>');
      console.log('Example: storage:download uploads/myfile.txt ./myfile.txt');
      console.log('');
      return;
    }

    status.info(`Downloading ${remote} to ${local}...`);

    try {
      await provider.download(remote, local);
      status.success('File downloaded');
    } catch (error) {
      status.error('Failed to download file');
      throw error;
    }
  }
};

/**
 * Delete file from storage
 */
export const remove = {
  name: 'storage:delete <path>',
  category: 'Storage',
  description: 'Delete file from storage',
  options: [
    { flags: '-r, --recursive', description: 'Delete recursively' },
    { flags: '-f, --force', description: 'Skip confirmation' }
  ],
  action: async (options, context, path) => {
    const provider = context.getStorageProvider();

    if (!provider) {
      status.error('Storage is not configured');
      return;
    }

    if (!path) {
      status.error('Path is required');
      console.log('');
      console.log('Usage: storage:delete <path>');
      console.log('Example: storage:delete uploads/myfile.txt');
      console.log('');
      return;
    }

    // Confirm deletion unless --force is used
    if (!options.force) {
      const Enquirer = (await import('enquirer')).default;
      const confirmResponse = await Enquirer.prompt({
        type: 'confirm',
        name: 'confirmed',
        message: `Delete ${path}${options.recursive ? ' (recursively)' : ''}?`,
        initial: false
      });

      if (!confirmResponse.confirmed) {
        console.log(colors.yellow('Operation cancelled.'));
        return;
      }
    }

    status.info(`Deleting ${path}...`);

    try {
      await provider.delete(path, { recursive: options.recursive });
      status.success('Deleted');
    } catch (error) {
      status.error('Failed to delete');
      throw error;
    }
  }
};

/**
 * Create directory in storage
 */
export const mkdir = {
  name: 'storage:mkdir <path>',
  category: 'Storage',
  description: 'Create directory in storage',
  action: async (options, context, path) => {
    const provider = context.getStorageProvider();

    if (!provider) {
      status.error('Storage is not configured');
      return;
    }

    if (!path) {
      status.error('Path is required');
      return;
    }

    status.info(`Creating directory: ${path}`);

    try {
      await provider.mkdir(path);
      status.success('Directory created');
    } catch (error) {
      status.error('Failed to create directory');
      throw error;
    }
  }
};

/**
 * Show storage usage
 */
export const usage = {
  name: 'storage:usage [path]',
  category: 'Storage',
  description: 'Show storage usage',
  action: async (options, context, path = '') => {
    const provider = context.getStorageProvider();

    if (!provider) {
      status.error('Storage is not configured');
      return;
    }

    status.info('Calculating storage usage...');

    try {
      const usageInfo = await provider.getUsage(path);

      console.log('');
      console.log(`  Total size: ${colors.cyan(formatSize(usageInfo.bytes))}`);
      if (usageInfo.files !== undefined) {
        console.log(`  Files: ${colors.cyan(usageInfo.files)}`);
      }
      if (usageInfo.directories !== undefined) {
        console.log(`  Directories: ${colors.cyan(usageInfo.directories)}`);
      }
      console.log('');
    } catch (error) {
      status.error('Failed to get storage usage');
      throw error;
    }
  }
};

/**
 * Check if file exists in storage
 */
export const exists = {
  name: 'storage:exists <path>',
  category: 'Storage',
  description: 'Check if file exists in storage',
  action: async (options, context, path) => {
    const provider = context.getStorageProvider();

    if (!provider) {
      status.error('Storage is not configured');
      return;
    }

    if (!path) {
      status.error('Path is required');
      return;
    }

    try {
      const fileExists = await provider.exists(path);

      if (fileExists) {
        console.log(`${colors.green('✓')} ${path} exists`);
      } else {
        console.log(`${colors.red('✗')} ${path} does not exist`);
      }
    } catch (error) {
      status.error('Failed to check file');
      throw error;
    }
  }
};

/**
 * Format bytes to human readable size
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export all commands
export default [
  list,
  upload,
  download,
  remove,
  mkdir,
  usage,
  exists,
];
