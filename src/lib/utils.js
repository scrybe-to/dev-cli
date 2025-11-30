import fs from 'fs';

/**
 * Load environment variables from a file
 *
 * @param {string} filePath - Path to .env file
 * @returns {Object} Key-value pairs of environment variables
 */
export function loadEnvVars(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const envContent = fs.readFileSync(filePath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }

      const [key, ...valueParts] = trimmedLine.split('=');
      if (key) {
        // Remove quotes from value
        envVars[key.trim()] = valueParts.join('=').replace(/^['"]|['"]$/g, '').trim();
      }
    });

    return envVars;
  } catch (error) {
    console.warn(`Failed to load environment from ${filePath}:`, error.message);
    return {};
  }
}

/**
 * Parse environment file and return as object
 * Alias for loadEnvVars for clarity
 */
export const parseEnvFile = loadEnvVars;

/**
 * Format bytes to human-readable string
 *
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sleep for specified milliseconds
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if running in CI environment
 *
 * @returns {boolean}
 */
export function isCI() {
  return process.env.CI === 'true' || process.env.CI === '1';
}

/**
 * Check if TTY is available
 *
 * @returns {boolean}
 */
export function hasTTY() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

/**
 * Get TTY flags for Docker exec
 *
 * @returns {string[]} Array of flags (['-it'] or ['-i'])
 */
export function getTTYFlags() {
  return hasTTY() ? ['-it'] : ['-i'];
}

/**
 * Ensure directory exists, create if not
 *
 * @param {string} dirPath - Directory path
 */
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read JSON file safely
 *
 * @param {string} filePath - Path to JSON file
 * @returns {Object|null} Parsed JSON or null if error
 */
export function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write JSON file safely
 *
 * @param {string} filePath - Path to JSON file
 * @param {Object} data - Data to write
 * @param {number} spaces - Indentation spaces
 */
export function writeJSON(filePath, data, spaces = 2) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, spaces), 'utf8');
}
