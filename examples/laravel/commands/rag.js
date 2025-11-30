/**
 * Example Custom Command: RAG Knowledge Base
 *
 * This demonstrates how to create project-specific commands that integrate
 * with the core CLI utilities.
 */

import { execContainer, status, colors, createSpinner } from '@artifex/dev-cli';

/**
 * Index documents into RAG knowledge base
 */
export default {
  name: 'rag:index',
  description: 'Index documents into RAG knowledge base',
  options: [
    { flags: '--force', description: 'Force reindex all documents' },
    { flags: '--update', description: 'Update only changed documents' },
    { flags: '--dry-run', description: 'Preview without making changes' }
  ],
  action: async (options, context) => {
    const { containers } = context;

    const spinner = createSpinner('Indexing documents...');

    try {
      const args = ['artisan', 'rag:index'];

      if (options.force) {
        args.push('--force');
      }

      if (options.update) {
        args.push('--update');
      }

      if (options.dryRun) {
        args.push('--dry-run');
      }

      await execContainer(containers.app, 'php', args, {
        stdio: 'inherit'
      });

      spinner.succeed('Documents indexed successfully');
    } catch (error) {
      spinner.fail('Failed to index documents');
      throw error;
    }
  }
};

/**
 * Alternative: Export multiple commands from one file
 */
export const ragSearch = {
  name: 'rag:search [query...]',
  description: 'Search the RAG knowledge base',
  options: [
    { flags: '-l, --limit <number>', description: 'Maximum results', defaultValue: '5' }
  ],
  action: async (options, context, ...query) => {
    const { containers } = context;

    if (query.length === 0) {
      status.error('Search query required');
      return;
    }

    const searchQuery = query.join(' ');

    status.info(`Searching for: ${colors.cyan(searchQuery)}`);

    await execContainer(containers.app, 'php', [
      'artisan', 'rag:search', searchQuery, '--limit', options.limit
    ], {
      stdio: 'inherit'
    });
  }
};

export const ragStatus = {
  name: 'rag:status',
  description: 'Check RAG system status',
  action: async (options, context) => {
    const { containers } = context;

    await execContainer(containers.app, 'php', [
      'artisan', 'rag:status'
    ], {
      stdio: 'inherit'
    });
  }
};
