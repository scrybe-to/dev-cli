import figlet from 'figlet';
import { colors } from './output.js';
import gradientString from 'gradient-string';
import { getGradient } from './gradients.js';

/**
 * Generate ASCII art banner from text using figlet
 *
 * @param {string} text - Text to convert to ASCII art
 * @param {Object} options - Banner options
 * @returns {Promise<string>} ASCII art banner
 */
export async function generateBanner(text, options = {}) {
  const {
    font = 'Standard',
    color = 'cyan',
    gradient: useGradient = false,
    gradientColors = ['#667eea', '#764ba2'],
  } = options;

  try {
    // Generate ASCII art (figlet already returns a promise)
    let banner = await new Promise((resolve, reject) => {
      figlet.text(text, { font }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // Apply coloring
    if (useGradient) {
      // Use .multiline() for smoother gradients across multiple lines
      banner = gradientString(...gradientColors).multiline(banner);
    } else if (color && colors[color]) {
      banner = colors[color](banner);
    }

    return banner;
  } catch (error) {
    // Fallback to simple text if font fails
    console.warn(`Failed to generate banner with font '${font}': ${error.message}`);
    return text;
  }
}

/**
 * Display banner with optional tagline
 *
 * @param {string} text - Main banner text
 * @param {Object} options - Display options
 */
export async function displayBanner(text, options = {}) {
  const {
    tagline = '',
    version = '',
    ...bannerOptions
  } = options;

  const banner = await generateBanner(text, bannerOptions);
  console.log('');
  console.log(banner);

  if (tagline) {
    console.log(colors.dim('  ' + tagline));
  }

  if (version) {
    console.log(colors.dim('  v' + version));
  }

  console.log('');
}

/**
 * Get list of available figlet fonts
 *
 * @returns {Promise<string[]>} Array of font names
 */
export async function getAvailableFonts() {
  try {
    return await new Promise((resolve, reject) => {
      figlet.fonts((err, fonts) => {
        if (err) reject(err);
        else resolve(fonts);
      });
    });
  } catch (error) {
    console.error('Failed to load figlet fonts:', error.message);
    return ['Standard'];
  }
}

/**
 * Get curated list of recommended fonts
 *
 * @returns {Object} Categorized font recommendations
 */
export function getRecommendedFonts() {
  return {
    modern: [
      'ANSI Shadow',
      'Big',
      'Big Money-ne',
      'Big Money-nw',
      'Block',
      'Bloody',
      'Bolger',
      'Colossal',
      'Doom',
      'Fire Font-s',
      'Graffiti',
      'Isometric1',
      'Isometric2',
      'Isometric3',
      'Isometric4',
      'Larry 3D',
      'Pagga',
      'Slant',
      'Small Slant',
      'Speed',
      'Standard',
      'Star Wars',
      'Univers',
    ],
    classic: [
      'Banner',
      'Banner3',
      'Banner4',
      'Doh',
      'Graceful',
      'Lean',
      'Mini',
      'Rounded',
      'Shadow',
      'Short',
      'Small',
      'Soft',
      'Thick',
      'Thin',
    ],
    decorative: [
      '3D-ASCII',
      'Calvin S',
      'Crazy',
      'Dancing Font',
      'Delta Corps Priest 1',
      'Electronic',
      'Fender',
      'Fire Font-k',
      'Gothic',
      'Greek',
      'Impossible',
      'Merlin1',
      'Nancyj',
      'Ogre',
      'Rectangles',
      'Shimrod',
    ],
    compact: [
      'Alligator',
      'Alpha',
      'Alphabet',
      'Avatar',
      'Banner3-D',
      'Basic',
      'Bell',
      'Binary',
      'Caligraphy',
      'Chunky',
      'Contessa',
      'Contrast',
      'Digital',
    ],
  };
}

/**
 * Preview a single font
 *
 * @param {string} font - Font name
 * @param {string} text - Text to preview
 * @returns {Promise<Object>} Preview result with banner and metadata
 */
export async function previewFont(font, text = 'DEMO') {
  try {
    const banner = await new Promise((resolve, reject) => {
      figlet.text(text, { font }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    return {
      font,
      banner,
      success: true,
    };
  } catch (error) {
    return {
      font,
      banner: null,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Preview all fonts with sample text (non-interactive)
 *
 * @param {string} text - Text to preview
 * @param {string[]} fonts - List of fonts (defaults to recommended)
 */
export async function previewFonts(text = 'DEMO', fonts = null) {
  const fontsToPreview = fonts || getRecommendedFonts().modern;

  console.log(colors.bold('\nPreviewing Fonts:\n'));

  for (const font of fontsToPreview) {
    const result = await previewFont(font, text);

    if (result.success) {
      console.log(colors.yellow(`${font}:`));
      console.log(colors.cyan(result.banner));
      console.log('');
    }
  }
}
