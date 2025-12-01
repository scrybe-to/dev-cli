/**
 * @artifex/dev-cli
 *
 * Main exports for the generic development CLI
 */

// Core exports
export { loadConfig, getDefaultConfig, generateConfigFileContent } from './core/config-loader.js';
export { Context, createContext } from './core/context.js';
export { loadCommands, registerCommands } from './core/command-loader.js';
export { createCLI, runCLI } from './core/cli.js';
export { PluginManager, getPluginManager, createPluginManager, resetPluginManager } from './core/plugin-manager.js';
export { ProviderRegistry, getRegistry, createRegistry, resetRegistry } from './core/provider-registry.js';

// Execution context exports
export { BaseExecutor } from './execution/base-executor.js';
export { DockerExecutor } from './execution/docker-executor.js';
export { NativeExecutor } from './execution/native-executor.js';
export { SSHExecutor } from './execution/ssh-executor.js';
export { createExecutor } from './execution/index.js';

// Provider exports
export { BaseDatabaseProvider } from './providers/database/base-provider.js';
export { createDatabaseProvider, registerDatabaseProviders } from './providers/database/index.js';
export { BaseStorageProvider } from './providers/storage/base-provider.js';
export { createStorageProvider, registerStorageProviders } from './providers/storage/index.js';
export { BaseHostsProvider } from './providers/hosts/base-provider.js';
export { createHostsProvider, registerHostsProviders } from './providers/hosts/index.js';

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
