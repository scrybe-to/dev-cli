/**
 * Banner Command
 *
 * Preview and test ASCII banners with different fonts and colors
 */

import readline from 'readline';
import { generateBanner, previewFont, getRecommendedFonts, getAvailableFonts } from '../../lib/banner.js';
import { status, colors } from '../../lib/output.js';
import { getGradient, getGradientNames, gradientPresets } from '../../lib/gradients.js';
import gradientString from 'gradient-string';

/**
 * Preview subcommand - quick banner preview with specific options
 */
const previewSubcommand = {
  name: 'preview',
  description: 'Preview ASCII banner with different fonts and colors',
  options: [
    { flags: '-t, --text <text>', description: 'Text to display (defaults to project name)' },
    { flags: '-f, --font <font>', description: 'Figlet font name (default: ANSI Shadow)' },
    { flags: '-g, --gradient', description: 'Enable gradient' },
    { flags: '-c, --colors <colors>', description: 'Gradient colors (comma-separated hex, e.g., #667eea,#764ba2)' },
    { flags: '--list-fonts', description: 'List available fonts' },
  ],
  action: async (options, context) => {
    // List fonts if requested
    if (options.listFonts) {
      console.log(colors.bold('\nPopular Figlet Fonts:\n'));
      const popularFonts = [
        'ANSI Shadow',
        'Big',
        'Standard',
        'Slant',
        'Small Slant',
        '3D-ASCII',
        'Larry 3D',
        'Banner',
        'Doom',
        'Graffiti',
        'Isometric1',
        'Colossal',
        'Small',
        'Mini',
      ];

      popularFonts.forEach(font => {
        console.log(colors.cyan(`  - ${font}`));
      });

      console.log(colors.dim('\nSee more at: http://www.figlet.org/examples.html\n'));
      return;
    }

    // Get text to display
    const text = options.text || context.config.name || 'PREVIEW';

    // Get font
    const font = options.font || 'ANSI Shadow';

    // Parse gradient colors
    let gradientColors = ['#667eea', '#764ba2'];
    if (options.colors) {
      gradientColors = options.colors.split(',').map(c => c.trim());
      if (gradientColors.length < 2) {
        status.error('Gradient requires at least 2 colors');
        return;
      }
    }

    // Banner config
    const bannerConfig = {
      font,
      gradient: options.gradient || false,
      gradientColors,
    };

    try {
      status.info(`Generating banner with font: ${font}${options.gradient ? ' (gradient)' : ''}`);
      console.log('');

      const bannerText = await generateBanner(text, bannerConfig);
      console.log(bannerText);

      console.log('');

      // Show config example
      console.log(colors.dim('To use this banner, add to cli.config.js:\n'));
      console.log(colors.cyan('branding: {'));
      console.log(colors.cyan('  banner: true,'));
      console.log(colors.cyan('  asciiBanner: {'));
      console.log(colors.cyan(`    text: '${text}',`));
      console.log(colors.cyan(`    font: '${font}',`));
      console.log(colors.cyan(`    gradient: ${bannerConfig.gradient},`));
      if (bannerConfig.gradient) {
        console.log(colors.cyan(`    gradientColors: [${gradientColors.map(c => `'${c}'`).join(', ')}],`));
      }
      console.log(colors.cyan('  },'));
      console.log(colors.cyan('}'));
      console.log('');

    } catch (error) {
      status.error(`Failed to generate banner: ${error.message}`);
      if (error.message.includes('font')) {
        console.log(colors.yellow('\nTip: Run "banner preview --list-fonts" to see available fonts'));
      }
    }
  }
};

/**
 * Browse subcommand - interactive font/gradient browser
 */
const browseSubcommand = {
  name: 'browse',
  description: 'Interactive banner browser with font/gradient navigation',
  options: [
    { flags: '-t, --text <text>', description: 'Text to display (defaults to project name)' },
    { flags: '-g, --gradient <preset>', description: 'Gradient preset name or colors (e.g., synthwave or #667eea,#764ba2)' },
  ],
  action: async (options, context) => {
    let text = options.text || context.config.name || 'PREVIEW';
    let gradientColors = null;
    let useGradient = false;
    let currentGradientName = 'purple';

    // Parse gradient option
    if (options.gradient) {
      const preset = getGradient(options.gradient);
      if (preset) {
        gradientColors = preset.colors;
        currentGradientName = options.gradient;
        useGradient = true;
      } else {
        // Parse custom colors
        gradientColors = options.gradient.split(',').map(c => c.trim());
        useGradient = true;
        currentGradientName = 'custom';
      }
    } else {
      // Default gradient
      const preset = gradientPresets.purple;
      gradientColors = preset.colors;
    }

    let fonts = [];
    let currentIndex = 0;
    let displayMode = 'modern';

    function clearScreen() {
      console.clear();
      process.stdout.write('\x1b[H');
    }

    async function displayCurrent() {
      clearScreen();

      const font = fonts[currentIndex];
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
}`;
      } else {
        config = `
asciiBanner: {
  text: '${text.toUpperCase()}',
  font: '${font}',
  color: 'cyan',
}`;
      }

      console.log('\n' + colors.green('✓ Copy this to your cli.config.js:'));
      console.log(colors.cyan(config));
      console.log('\nPress any key to continue...');
    }

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

    function cycleGradient(direction = 1) {
      const names = getGradientNames();
      const currentIdx = names.indexOf(currentGradientName);
      const nextIdx = (currentIdx + direction + names.length) % names.length;
      currentGradientName = names[nextIdx];
      gradientColors = gradientPresets[currentGradientName].colors;
    }

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

      console.log('\n' + colors.dim('Press any key to continue...'));
    }

    async function handleKeyPress(str, key) {
      if (!key) return;

      if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        process.stdin.setRawMode(false);
        process.exit(0);
      }

      if (key.name === 'right') {
        currentIndex = (currentIndex + 1) % fonts.length;
        await displayCurrent();
      } else if (key.name === 'left') {
        currentIndex = (currentIndex - 1 + fonts.length) % fonts.length;
        await displayCurrent();
      } else if (key.name === 'up') {
        cycleGradient(-1);
        useGradient = true;
        await displayCurrent();
      } else if (key.name === 'down') {
        cycleGradient(1);
        useGradient = true;
        await displayCurrent();
      } else if (key.name === '1') {
        await switchMode('modern');
      } else if (key.name === '2') {
        await switchMode('classic');
      } else if (key.name === '3') {
        await switchMode('decorative');
      } else if (key.name === '4') {
        await switchMode('compact');
      } else if (key.name === 'a') {
        await switchMode('all');
      } else if (key.name === 'g') {
        useGradient = !useGradient;
        await displayCurrent();
      } else if (key.name === 'h') {
        showGradientHelp();
      } else if (key.name === 's') {
        clearScreen();
        saveConfig();
      }
    }

    // Start interactive mode
    await switchMode('modern');

    readline.emitKeypressEvents(process.stdin);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', handleKeyPress);

    await displayCurrent();
  }
};

/**
 * Banner parent command with subcommands
 */
export default {
  name: 'banner',
  category: 'Setup',
  description: 'ASCII banner preview and customization tools',
  subcommands: [previewSubcommand, browseSubcommand],
};
