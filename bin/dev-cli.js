#!/usr/bin/env node

/**
 * Generic Development CLI Entry Point
 *
 * This binary loads the project's cli.config.js and runs the CLI
 */

import { runCLI } from '../src/index.js';

// Parse CLI flags
const args = process.argv.slice(2);
const options = {
  debug: process.env.DEBUG === '1' || args.includes('--debug'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Run CLI
runCLI(process.argv, options).catch((error) => {
  console.error('Fatal error:', error.message);
  if (options.debug) {
    console.error(error.stack);
  }
  process.exit(1);
});
