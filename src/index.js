/**
 * @artifex/dev-cli
 *
 * Main exports for the generic development CLI
 */

// Core exports
export { loadConfig, getDefaultConfig } from './core/config-loader.js';
export { Context, createContext } from './core/context.js';
export { loadCommands, registerCommands } from './core/command-loader.js';
export { createCLI, runCLI } from './core/cli.js';

// Docker utilities
export {
  checkDocker,
  checkContainers,
  execContainer,
  compose,
  getRunningContainers,
  getContainerStats,
  getDockerDiskUsage,
  withDocker,
} from './lib/docker.js';

// Output utilities
export {
  colors,
  status,
  createSpinner,
  createBox,
  displaySimpleBanner,
  formatCommand,
  exitWithError,
  displayTable,
} from './lib/output.js';

// Banner utilities
export {
  generateBanner,
  displayBanner,
  getAvailableFonts,
  previewFonts,
} from './lib/banner.js';

// Gradient presets
export {
  gradientPresets,
  getGradient,
  getGradientNames,
  getGradientsByCategory,
  getRandomGradient,
} from './lib/gradients.js';

// General utilities
export {
  loadEnvVars,
  parseEnvFile,
  formatBytes,
  sleep,
  isCI,
  hasTTY,
  getTTYFlags,
  ensureDir,
  readJSON,
  writeJSON,
} from './lib/utils.js';
