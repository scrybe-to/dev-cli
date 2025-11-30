/**
 * MinIO Storage Commands
 *
 * Commands for managing MinIO object storage buckets
 */

import { execContainer } from '../../lib/docker.js';
import { status, colors } from '../../lib/output.js';

/**
 * Ensure MinIO alias is configured
 */
async function ensureMinioAlias(context) {
  const { containers } = context;

  // Get credentials from environment or use defaults
  const access = process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ROOT_USER || 'minioadmin';
  const secret = process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
  const endpoint = 'http://127.0.0.1:9000';

  // Set or update the 'local' alias inside the MinIO container
  await execContainer(containers.minio || containers.storage, 'mc', [
    'alias', 'set', 'local', endpoint, access, secret
  ], { stdio: 'pipe' });
}

/**
 * List MinIO buckets
 */
export const list = {
  name: 'minio:list',
  category: 'Storage',
  description: 'List MinIO buckets',
  action: async (options, context) => {
    const { containers } = context;

    if (!containers.minio && !containers.storage) {
      status.error('MinIO container not configured');
      console.log('');
      console.log(colors.dim('Add to your config:'));
      console.log(colors.cyan('  containers: {'));
      console.log(colors.cyan('    minio: "your-minio-container-name"'));
      console.log(colors.cyan('  }'));
      console.log('');
      return;
    }

    status.info('Listing MinIO buckets...');
    console.log('');

    try {
      await ensureMinioAlias(context);
      await execContainer(containers.minio || containers.storage, 'mc', ['ls', 'local']);
    } catch (error) {
      status.error('Failed to list MinIO buckets');
      throw error;
    }
  }
};

/**
 * Create MinIO bucket
 */
export const create = {
  name: 'minio:create <bucket>',
  category: 'Storage',
  description: 'Create MinIO bucket',
  options: [
    { flags: '--public', description: 'Make bucket public' }
  ],
  action: async (options, context, bucket) => {
    const { containers } = context;

    if (!bucket) {
      status.error('Bucket name is required');
      console.log('');
      console.log('Usage: minio:create <bucket>');
      console.log('Example: minio:create my-bucket');
      console.log('');
      return;
    }

    if (!containers.minio && !containers.storage) {
      status.error('MinIO container not configured');
      return;
    }

    status.info(`Creating MinIO bucket: ${colors.cyan(bucket)}`);

    try {
      await ensureMinioAlias(context);

      // Create bucket
      await execContainer(containers.minio || containers.storage, 'mc', [
        'mb', `local/${bucket}`
      ]);

      // Set policy
      const policy = options.public ? 'public' : 'private';
      await execContainer(containers.minio || containers.storage, 'mc', [
        'anonymous', 'set', policy, `local/${bucket}`
      ], { stdio: 'pipe' });

      console.log('');
      status.success(`Bucket '${bucket}' created successfully`);
      console.log('');
      console.log(`Policy: ${policy === 'public' ? colors.green('public') : colors.yellow('private')}`);
      console.log('');
    } catch (error) {
      status.error(`Failed to create bucket '${bucket}'`);
      throw error;
    }
  }
};

/**
 * Clear MinIO bucket
 */
export const clear = {
  name: 'minio:clear <bucket>',
  category: 'Storage',
  description: 'Clear all objects from bucket',
  action: async (options, context, bucket) => {
    const { containers } = context;

    if (!bucket) {
      status.error('Bucket name is required');
      console.log('');
      console.log('Usage: minio:clear <bucket>');
      console.log('Example: minio:clear my-bucket');
      console.log('');
      return;
    }

    if (!containers.minio && !containers.storage) {
      status.error('MinIO container not configured');
      return;
    }

    // Confirm before clearing
    const Enquirer = (await import('enquirer')).default;
    const confirmResponse = await Enquirer.prompt({
      type: 'confirm',
      name: 'confirmed',
      message: `This will delete all objects in bucket '${bucket}'. Are you sure?`,
      initial: false
    });

    if (!confirmResponse.confirmed) {
      console.log(colors.yellow('Operation cancelled.'));
      return;
    }

    status.info(`Clearing MinIO bucket: ${colors.cyan(bucket)}`);

    try {
      await ensureMinioAlias(context);

      // Remove all objects recursively
      await execContainer(containers.minio || containers.storage, 'mc', [
        'rm', '--recursive', '--force', `local/${bucket}`
      ]);

      console.log('');
      status.success(`Bucket '${bucket}' cleared successfully`);
    } catch (error) {
      status.error(`Failed to clear bucket '${bucket}'`);
      throw error;
    }
  }
};

// Export all commands
export default [
  list,
  create,
  clear,
];
