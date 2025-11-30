#!/usr/bin/env node

/**
 * Interactive Banner Preview Tool
 *
 * Navigate through different banner fonts with arrow keys
 */

import readline from 'readline';
import { previewFont, getRecommendedFonts, getAvailableFonts, generateBanner } from '../src/lib/banner.js';
import { colors } from '../src/lib/output.js';
import { getGradient, getGradientNames, gradientPresets } from '../src/lib/gradients.js';
import gradientString from 'gradient-string';

// Parse command line arguments
const args = process.argv.slice(2);
let text = 'DEMO';
let gradientColors = null;
let useGradient = false;
let currentGradientName = 'purple';

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg.startsWith('--gradient=')) {
    const value = arg.split('=')[1];

    // Check if it's a preset name or custom colors
    const preset = getGradient(value);
    if (preset) {
      gradientColors = preset.colors;
      currentGradientName = value;
      useGradient = true;
    } else {
      // Parse custom colors: --gradient=#667eea,#764ba2
      gradientColors = value.split(',').map(c => c.trim());
      useGradient = true;
      currentGradientName = 'custom';
    }
  } else if (arg === '--gradient') {
    // Use default gradient
    const preset = gradientPresets.purple;
    gradientColors = preset.colors;
    useGradient = true;
  } else if (!text || text === 'DEMO') {
    text = arg;
  }
}

// Default gradient if none specified
if (!gradientColors) {
  const preset = gradientPresets.purple;
  gradientColors = preset.colors;
}

let fonts = [];
let currentIndex = 0;
let displayMode = 'modern'; // modern, classic, decorative, compact, all

/**
 * Clear the screen
 */
function clearScreen() {
  console.clear();
  // Move cursor to top
  process.stdout.write('\x1b[H');
}

/**
 * Display current font preview
 */
async function displayCurrent() {
  clearScreen();

  const font = fonts[currentIndex];

  // Generate banner with gradient if specified
  let banner;
  if (useGradient && gradientColors) {
    banner = await generateBanner(text, {
      font,
      gradient: true,
      gradientColors,
    });
  } else {
    const result = await previewFont(font, text);
    banner = result.success ? result.banner : colors.red(`Error: ${result.error}`);
  }

  console.log(colors.bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(colors.bold('║  Interactive Banner Preview                                ║'));
  console.log(colors.bold('╚════════════════════════════════════════════════════════════╝\n'));

  console.log(colors.cyan(`Font: ${colors.bold(font)} (${currentIndex + 1}/${fonts.length})`));
  console.log(colors.dim(`Mode: ${displayMode}`));

  if (useGradient && gradientColors) {
    const gradientPreview = gradientColors.map(c => {
      // Create a small colored block for each color
      return gradientString(c, c)('███');
    }).join(' → ');

    const gradientInfo = currentGradientName !== 'custom'
      ? `${currentGradientName} - ${gradientPresets[currentGradientName]?.description || ''}`
      : gradientColors.join(', ');

    console.log(colors.dim(`Gradient: ${gradientPreview} ${gradientInfo}`));
  }

  console.log('');

  console.log(banner);

  console.log('');
  console.log(colors.dim('─'.repeat(60)));
  console.log('');
  console.log(colors.yellow('Controls:'));
  console.log('  ← →     Navigate fonts');
  console.log('  ↑ ↓     Cycle gradients');
  console.log('  1-4     Switch category (1=Modern, 2=Classic, 3=Decorative, 4=Compact)');
  console.log('  a       Show all fonts');
  console.log('  g       Toggle gradient on/off');
  console.log('  h       Show gradient help');
  console.log('  s       Save current config');
  console.log('  q/ESC   Quit');
  console.log('');
}

/**
 * Save current font to config snippet
 */
function saveConfig() {
  const font = fonts[currentIndex];

  let config;
  if (useGradient && gradientColors) {
    config = `
asciiBanner: {
  text: '${text.toUpperCase()}',
  font: '${font}',
  gradient: true,
  gradientColors: ['${gradientColors.join("', '")}'],
}
`;
  } else {
    config = `
asciiBanner: {
  text: '${text.toUpperCase()}',
  font: '${font}',
  color: 'cyan',
}
`;
  }

  console.log('\n' + colors.green('✓ Copy this to your cli.config.js:'));
  console.log(colors.cyan(config));
  console.log('Press any key to continue...');
}

/**
 * Switch display mode
 */
async function switchMode(mode) {
  displayMode = mode;
  currentIndex = 0;

  const recommended = getRecommendedFonts();

  switch (mode) {
    case 'modern':
      fonts = recommended.modern;
      break;
    case 'classic':
      fonts = recommended.classic;
      break;
    case 'decorative':
      fonts = recommended.decorative;
      break;
    case 'compact':
      fonts = recommended.compact;
      break;
    case 'all':
      fonts = await getAvailableFonts();
      break;
  }

  await displayCurrent();
}

/**
 * Cycle to next gradient
 */
function cycleGradient(direction = 1) {
  const names = getGradientNames();
  const currentIdx = names.indexOf(currentGradientName);
  const nextIdx = (currentIdx + direction + names.length) % names.length;
  currentGradientName = names[nextIdx];
  gradientColors = gradientPresets[currentGradientName].colors;
}

/**
 * Show gradient help
 */
function showGradientHelp() {
  clearScreen();

  console.log(colors.bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(colors.bold('║  Available Gradient Presets                                ║'));
  console.log(colors.bold('╚════════════════════════════════════════════════════════════╝\n'));

  console.log(colors.yellow('Popular:'));
  ['synthwave', 'purple', 'sunset', 'ocean', 'neon', 'cyberpunk'].forEach(name => {
    const preset = gradientPresets[name];
    const preview = gradientString(...preset.colors)('████████');
    console.log(`  ${preview} ${colors.cyan(preset.name.padEnd(20))} ${colors.dim(preset.description)}`);
  });

  console.log('\n' + colors.yellow('All Presets:'));
  Object.entries(gradientPresets).forEach(([key, preset]) => {
    const preview = gradientString(...preset.colors)('████');
    console.log(`  ${preview} ${colors.cyan(key.padEnd(15))} ${colors.dim(preset.description)}`);
  });

  console.log('\n' + colors.dim('─'.repeat(60)));
  console.log(colors.yellow('\nUsage:'));
  console.log('  node examples/banner-preview.js TEXT --gradient=PRESET_NAME');
  console.log('\nExamples:');
  console.log('  node examples/banner-preview.js FIRE --gradient=flame');
  console.log('  node examples/banner-preview.js OCEAN --gradient=ocean');
  console.log('  node examples/banner-preview.js NEON --gradient=cyberpunk');
  console.log('\n' + colors.dim('Press any key to continue...'));
}

/**
 * Handle key press
 */
async function handleKeyPress(str, key) {
  if (!key) return;

  // Quit
  if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
    process.exit(0);
  }

  // Navigate fonts (left/right)
  if (key.name === 'right') {
    currentIndex = (currentIndex + 1) % fonts.length;
    await displayCurrent();
  } else if (key.name === 'left') {
    currentIndex = (currentIndex - 1 + fonts.length) % fonts.length;
    await displayCurrent();
  }

  // Navigate gradients (up/down)
  else if (key.name === 'up') {
    cycleGradient(-1);
    useGradient = true;
    await displayCurrent();
  } else if (key.name === 'down') {
    cycleGradient(1);
    useGradient = true;
    await displayCurrent();
  }

  // Switch category
  if (key.name === '1') {
    await switchMode('modern');
  } else if (key.name === '2') {
    await switchMode('classic');
  } else if (key.name === '3') {
    await switchMode('decorative');
  } else if (key.name === '4') {
    await switchMode('compact');
  } else if (key.name === 'a') {
    await switchMode('all');
  }

  // Toggle gradient
  if (key.name === 'g') {
    useGradient = !useGradient;
    await displayCurrent();
  }

  // Show gradient help
  if (key.name === 'h') {
    showGradientHelp();
  }

  // Save config
  if (key.name === 's') {
    clearScreen();
    saveConfig();
  }
}

/**
 * Start interactive preview
 */
async function startInteractive() {
  // Initialize with modern fonts
  await switchMode('modern');

  // Setup readline for key press handling
  readline.emitKeypressEvents(process.stdin);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on('keypress', handleKeyPress);

  // Display initial font
  await displayCurrent();
}

// Start the interactive preview
startInteractive().catch(error => {
  console.error(colors.red('Error:'), error.message);
  process.exit(1);
});
