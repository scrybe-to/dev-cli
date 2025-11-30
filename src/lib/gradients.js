/**
 * Predefined gradient presets
 *
 * Each gradient has a name, colors, and description
 */

export const gradientPresets = {
  // Purple & Blue
  synthwave: {
    name: 'Synthwave',
    colors: ['#ff00ff', '#00ffff'],
    description: 'Retro synthwave vibes - magenta to cyan',
  },
  purple: {
    name: 'Purple Dream',
    colors: ['#667eea', '#764ba2'],
    description: 'Deep purple to violet',
  },
  vice: {
    name: 'Vice',
    colors: ['#5433ff', '#20bdff', '#a5fecb'],
    description: 'Miami Vice inspired - purple to cyan to mint',
  },

  // Pink & Orange
  sunset: {
    name: 'Sunset',
    colors: ['#ff6b6b', '#feca57'],
    description: 'Warm sunset - red to yellow',
  },
  peach: {
    name: 'Peach',
    colors: ['#f093fb', '#f5576c'],
    description: 'Sweet peach - pink to coral',
  },
  flame: {
    name: 'Flame',
    colors: ['#f12711', '#f5af19'],
    description: 'Hot flame - red to orange',
  },

  // Blue & Green
  ocean: {
    name: 'Ocean',
    colors: ['#2E3192', '#1BFFFF'],
    description: 'Deep ocean - navy to cyan',
  },
  mint: {
    name: 'Mint',
    colors: ['#00d2ff', '#3a7bd5'],
    description: 'Cool mint - cyan to blue',
  },
  forest: {
    name: 'Forest',
    colors: ['#56ab2f', '#a8e063'],
    description: 'Fresh forest - dark to light green',
  },
  matrix: {
    name: 'Matrix',
    colors: ['#00ff00', '#003300'],
    description: 'Matrix code - bright to dark green',
  },

  // Warm Colors
  fire: {
    name: 'Fire',
    colors: ['#f12711', '#f5af19'],
    description: 'Blazing fire - red to orange',
  },
  lava: {
    name: 'Lava',
    colors: ['#ff0000', '#ff7f00', '#ffff00'],
    description: 'Hot lava - red to orange to yellow',
  },

  // Cool Colors
  ice: {
    name: 'Ice',
    colors: ['#a8edea', '#fed6e3'],
    description: 'Frozen ice - cyan to pink',
  },
  frost: {
    name: 'Frost',
    colors: ['#000428', '#004e92'],
    description: 'Winter frost - dark to light blue',
  },

  // Neon
  neon: {
    name: 'Neon',
    colors: ['#00f260', '#0575e6'],
    description: 'Electric neon - green to blue',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    colors: ['#f700ff', '#00d4ff'],
    description: 'Cyberpunk city - magenta to cyan',
  },

  // Nature
  aurora: {
    name: 'Aurora',
    colors: ['#00c9ff', '#92fe9d'],
    description: 'Northern lights - cyan to mint',
  },
  cherry: {
    name: 'Cherry Blossom',
    colors: ['#eb3349', '#f45c43'],
    description: 'Spring cherry - red to coral',
  },
  tropical: {
    name: 'Tropical',
    colors: ['#f46b45', '#eea849'],
    description: 'Tropical paradise - coral to gold',
  },

  // Pastels
  cotton: {
    name: 'Cotton Candy',
    colors: ['#fbc2eb', '#a6c1ee'],
    description: 'Soft cotton candy - pink to blue',
  },
  pastel: {
    name: 'Pastel Rainbow',
    colors: ['#fdcbf1', '#e6dee9'],
    description: 'Gentle pastels - pink to lavender',
  },

  // Dark & Moody
  midnight: {
    name: 'Midnight',
    colors: ['#232526', '#414345'],
    description: 'Dark midnight - charcoal gradient',
  },
  gotham: {
    name: 'Gotham',
    colors: ['#0f2027', '#203a43', '#2c5364'],
    description: 'Dark city - deep blues',
  },

  // Retro
  retro: {
    name: 'Retro',
    colors: ['#7F00FF', '#E100FF'],
    description: 'Retro wave - purple to magenta',
  },
  vaporwave: {
    name: 'Vaporwave',
    colors: ['#ff6ec7', '#7873f5'],
    description: 'Vaporwave aesthetic - pink to purple',
  },

  // Special
  rainbow: {
    name: 'Rainbow',
    colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'],
    description: 'Full rainbow spectrum',
  },
  gold: {
    name: 'Gold',
    colors: ['#FFD700', '#FFA500'],
    description: 'Luxurious gold',
  },
  silver: {
    name: 'Silver',
    colors: ['#C0C0C0', '#808080'],
    description: 'Sleek silver',
  },
};

/**
 * Get gradient by name
 *
 * @param {string} name - Gradient name
 * @returns {Object|null} Gradient preset or null if not found
 */
export function getGradient(name) {
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  return gradientPresets[key] || null;
}

/**
 * Get all gradient names
 *
 * @returns {string[]} Array of gradient names
 */
export function getGradientNames() {
  return Object.keys(gradientPresets);
}

/**
 * Get gradients by category
 *
 * @returns {Object} Categorized gradients
 */
export function getGradientsByCategory() {
  return {
    popular: ['synthwave', 'purple', 'sunset', 'ocean', 'neon', 'cyberpunk'],
    warm: ['sunset', 'peach', 'flame', 'fire', 'lava', 'tropical'],
    cool: ['ocean', 'mint', 'ice', 'frost', 'forest'],
    neon: ['neon', 'cyberpunk', 'synthwave', 'vice'],
    pastel: ['cotton', 'pastel', 'ice'],
    dark: ['midnight', 'gotham', 'frost'],
    retro: ['retro', 'vaporwave', 'synthwave'],
    nature: ['aurora', 'cherry', 'tropical', 'forest', 'ocean'],
    special: ['rainbow', 'gold', 'silver'],
  };
}

/**
 * Get random gradient
 *
 * @returns {Object} Random gradient preset
 */
export function getRandomGradient() {
  const names = getGradientNames();
  const randomName = names[Math.floor(Math.random() * names.length)];
  return gradientPresets[randomName];
}
