import chalk from 'chalk';
import ora from 'ora';

/**
 * Color utilities
 */
export const colors = {
  // Direct chalk exports
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blue: chalk.blue,
  magenta: chalk.magenta,
  cyan: chalk.cyan,
  white: chalk.white,
  gray: chalk.gray,
  dim: chalk.dim,
  bold: chalk.bold,
  underline: chalk.underline,

  // Semantic colors
  error: chalk.red.bold,
  success: chalk.green.bold,
  warning: chalk.yellow.bold,
  info: chalk.blue,
  muted: chalk.gray,

  // Brand colors
  primary: chalk.hex('#6366f1'),
  secondary: chalk.hex('#8b5cf6'),
  teal: chalk.hex('#14b8a6'),
};

/**
 * Status messages with consistent formatting
 */
export const status = {
  info(message) {
    console.log(`${colors.blue('ℹ')} ${message}`);
  },

  success(message) {
    console.log(`${colors.green('✔')} ${message}`);
  },

  error(message) {
    console.log(`${colors.red('✖')} ${message}`);
  },

  warning(message) {
    console.log(`${colors.yellow('⚠')} ${message}`);
  },

  debug(message) {
    if (process.env.DEBUG === '1') {
      console.log(`${colors.gray('●')} ${colors.dim(message)}`);
    }
  },
};

/**
 * Create a spinner for long-running operations
 *
 * @param {string} text - Spinner text
 * @returns {Ora} Ora spinner instance
 */
export function createSpinner(text = 'Loading...') {
  return ora({
    text,
    color: 'cyan',
  }).start();
}

/**
 * Create a boxed message
 *
 * @param {string} message - Message to box
 * @param {Object} options - Box options
 * @returns {string} Boxed message
 */
export function createBox(message, options = {}) {
  const {
    padding = 1,
    borderColor = 'cyan',
    textColor = 'white',
  } = options;

  const lines = message.split('\n');
  const maxLength = Math.max(...lines.map(line => line.length));

  const border = colors[borderColor] || chalk.cyan;
  const text = colors[textColor] || chalk.white;

  const horizontalBorder = '─'.repeat(maxLength + (padding * 2));
  const emptyLine = ' '.repeat(maxLength + (padding * 2));

  let box = border(`┌${horizontalBorder}┐\n`);

  // Add top padding
  for (let i = 0; i < padding; i++) {
    box += border(`│${emptyLine}│\n`);
  }

  // Add content lines
  lines.forEach(line => {
    const paddingLeft = ' '.repeat(padding);
    const paddingRight = ' '.repeat(maxLength - line.length + padding);
    box += border('│') + paddingLeft + text(line) + paddingRight + border('│\n');
  });

  // Add bottom padding
  for (let i = 0; i < padding; i++) {
    box += border(`│${emptyLine}│\n`);
  }

  box += border(`└${horizontalBorder}┘`);

  return box;
}

/**
 * Display a simple text banner (fallback)
 *
 * @param {string} name - CLI name
 * @param {string} version - CLI version
 */
export function displaySimpleBanner(name, version) {
  console.log('');
  console.log(colors.bold(colors.primary(`  ${name} CLI`)));
  console.log(colors.dim(`  v${version}`));
  console.log('');
}

/**
 * Format command for display
 *
 * @param {string} command - Command string
 * @returns {string} Formatted command
 */
export function formatCommand(command) {
  return colors.dim('$ ') + colors.cyan(command);
}

/**
 * Display error and exit
 *
 * @param {string} message - Error message
 * @param {number} exitCode - Exit code
 */
export function exitWithError(message, exitCode = 1) {
  status.error(message);
  process.exit(exitCode);
}

/**
 * Display table data
 * Simple implementation - can be enhanced with cli-table3 if needed
 *
 * @param {Array<Object>} rows - Table rows
 * @param {Object} options - Table options
 */
export function displayTable(rows, options = {}) {
  const { headers = [], colors: tableColors = {} } = options;

  if (headers.length > 0) {
    const headerRow = headers.map(h => colors.bold(h)).join('  ');
    console.log(headerRow);
    console.log('─'.repeat(headerRow.replace(/\u001b\[[0-9;]*m/g, '').length));
  }

  rows.forEach(row => {
    const values = Object.values(row);
    console.log(values.join('  '));
  });
}
