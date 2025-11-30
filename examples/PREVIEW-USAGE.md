# Banner Preview Usage

## Basic Usage

```bash
# Preview with default text
node examples/banner-preview.js

# Preview with custom text
node examples/banner-preview.js SCRYBE

# Preview with custom text and gradient
node examples/banner-preview.js SCRYBE --gradient=#667eea,#764ba2

# Different gradient colors
node examples/banner-preview.js API --gradient=#f093fb,#f5576c

# Use default gradient (purple to blue)
node examples/banner-preview.js DEPLOY --gradient
```

## Gradient Examples

### Purple to Blue (Default)
```bash
node examples/banner-preview.js SCRYBE --gradient=#667eea,#764ba2
```

### Fire (Red to Orange)
```bash
node examples/banner-preview.js FIRE --gradient=#f12711,#f5af19
```

### Ocean (Dark Blue to Cyan)
```bash
node examples/banner-preview.js OCEAN --gradient=#2E3192,#1BFFFF
```

### Sunset (Orange to Pink)
```bash
node examples/banner-preview.js SUNSET --gradient=#ff6b6b,#feca57
```

### Forest (Green to Light Green)
```bash
node examples/banner-preview.js FOREST --gradient=#56ab2f,#a8e063
```

### Neon (Green to Blue)
```bash
node examples/banner-preview.js NEON --gradient=#00f260,#0575e6
```

### Candy (Red to Pink)
```bash
node examples/banner-preview.js CANDY --gradient=#D31027,#EA384D
```

### Retro (Purple to Pink)
```bash
node examples/banner-preview.js RETRO --gradient=#7F00FF,#E100FF
```

### Ice (Aqua to Pink)
```bash
node examples/banner-preview.js ICE --gradient=#a8edea,#fed6e3
```

## Interactive Controls

Once in preview mode:

- **← →** - Navigate through fonts
- **1-4** - Switch categories:
  - `1` = Modern (23 fonts)
  - `2` = Classic (15 fonts)
  - `3` = Decorative (16 fonts)
  - `4` = Compact (13 fonts)
- **a** - Show ALL fonts (300+)
- **g** - Toggle gradient on/off
- **s** - Save current config to copy
- **q/ESC** - Quit

## Tips

1. **Start with gradient** - See how fonts look with colors
2. **Browse fonts** - Use arrow keys to find your favorite
3. **Toggle gradient** - Press `g` to compare with/without gradient
4. **Save config** - Press `s` to get config snippet
5. **Try different text** - Short text (3-8 chars) works best

## Examples

### Finding the Perfect Font
```bash
# Start with your project name and favorite colors
node examples/banner-preview.js MYAPP --gradient=#YOUR_COLOR_1,#YOUR_COLOR_2

# Browse fonts with arrow keys
# When you find one you like, press 's' to save the config
```

### Testing Different Gradients
```bash
# Try multiple gradient combinations
node examples/banner-preview.js LOGO --gradient=#667eea,#764ba2
node examples/banner-preview.js LOGO --gradient=#f093fb,#f5576c
node examples/banner-preview.js LOGO --gradient=#00f260,#0575e6
```

### No Gradient (Single Color)
```bash
# Start without gradient
node examples/banner-preview.js CLI

# Toggle gradient on with 'g' key in preview
```
