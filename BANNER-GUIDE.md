# Banner Customization Guide 🎨

## Interactive Preview Tool

Launch the interactive preview to browse 300+ fonts with arrow keys:

```bash
# Preview with your text
node examples/banner-preview.js SCRYBE

# Or use any text you want
node examples/banner-preview.js MYAPP
```

### Controls

- **← →** - Navigate through fonts
- **1-4** - Switch categories:
  - `1` = Modern (ANSI Shadow, Slant, Big, etc.)
  - `2` = Classic (Banner, Shadow, Rounded, etc.)
  - `3` = Decorative (Gothic, Graffiti, etc.)
  - `4` = Compact (Small, Mini, Thin, etc.)
- **a** - Show ALL fonts (300+!)
- **s** - Save current font config snippet
- **q/ESC** - Quit

## Configuration

In your `cli.config.js`:

```javascript
export default {
  name: 'myapp',
  // ...

  branding: {
    banner: true,
    asciiBanner: {
      text: 'SCRYBE',           // Text to display
      font: 'ANSI Shadow',      // Figlet font name
      gradient: true,           // Use gradient colors
      gradientColors: ['#667eea', '#764ba2'],  // Gradient colors
      // OR
      color: 'cyan',            // Single color (if gradient: false)
    },
  },
};
```

## Popular Fonts

### Modern & Bold

**ANSI Shadow** - Block style with drop shadows (current default)
```
███████╗ ██████╗██████╗ ██╗   ██╗██████╗ ███████╗
██╔════╝██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗██╔════╝
███████╗██║     ██████╔╝ ╚████╔╝ ██████╔╝█████╗
```

**Slant** - Stylized slanted letters
```
   _____    ______    ____     __  __    ____     ______
  / ___/   / ____/   / __ \   / / / /   / __ )   / ____/
  \__ \   / /       / /_/ /  / /_/ /   / __  |  / __/
```

**Big** - Large, bold letters
```
  SSSSS   CCCCC  RRRRRR  YY   YY BBBBB   EEEEEEE
 SS      CC      RR   RR  YY YY  BB   BB EE
```

**Doom** - Classic Doom game style
```
███████╗ ██████╗██████╗ ██╗   ██╗██████╗ ███████╗
██╔════╝██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗██╔════╝
```

### Fun & Decorative

**Star Wars**
```
   ▄████████     ███        ▄████████    ▄████████
  ███    ███ ▀█████████▄   ███    ███   ███    ███
  ███    █▀     ▀███▀▀██   ███    ███   ███    ███
```

**Graffiti**
```
  ________                _____  _____.__  __  .__
 /  _____/___________  _/ ____\/ ____\__|/  |_|__|
/   \  __\_  __ \__  \ \   __\\   __\|  \   __\  |
```

**Fire Font-s** - Flames!
```
(       )  (   (
)\ ) ( /(  )\ ))\ )
(()/( )\())(()/(()/(
```

### Classic & Clean

**Standard** - Default figlet font
```
  ____    __                     _               _
 / ___|  / /_ __ _ _ __   __| | __ _ _ __ __| |
 \___ \ | __/ _` | '_ \ / _` |/ _` | '__/ _` |
```

**Banner** - Bold banner style
```
 ####    #####    ##   #    # #####    ##   #####  #####
#         #    #  #  #  ##   # #    #  #  #  #    # #    #
 ####     #    # #    # # #  # #    # #    # #    # #    #
```

**Small** - Compact style
```
 ___ _ __ ___   __ _| | |
/ __| '_ ` _ \ / _` | | |
\__ \ | | | | | (_| | | |
```

## Configuration Examples

### Example 1: Modern Gradient (Default)

```javascript
branding: {
  banner: true,
  asciiBanner: {
    text: 'SCRYBE',
    font: 'ANSI Shadow',
    gradient: true,
    gradientColors: ['#667eea', '#764ba2'],  // Purple to blue
  },
}
```

### Example 2: Star Wars Style

```javascript
branding: {
  banner: true,
  asciiBanner: {
    text: 'API',
    font: 'Star Wars',
    gradient: true,
    gradientColors: ['#f093fb', '#f5576c'],  // Pink to red
  },
}
```

### Example 3: Simple Cyan

```javascript
branding: {
  banner: true,
  asciiBanner: {
    text: 'DEPLOY',
    font: 'Slant',
    color: 'cyan',  // Single color, no gradient
  },
}
```

### Example 4: Doom with Fire Gradient

```javascript
branding: {
  banner: true,
  asciiBanner: {
    text: 'GAME',
    font: 'Doom',
    gradient: true,
    gradientColors: ['#f12711', '#f5af19'],  // Fire colors
  },
}
```

## Color Options

### Single Colors (when gradient: false)

- `red` - Red
- `green` - Green
- `yellow` - Yellow
- `blue` - Blue
- `magenta` - Magenta/Purple
- `cyan` - Cyan/Aqua
- `white` - White
- `gray` - Gray

### Gradient Presets

Popular gradient combinations:

```javascript
// Purple to Blue (default)
gradientColors: ['#667eea', '#764ba2']

// Pink to Orange
gradientColors: ['#f093fb', '#f5576c']

// Ocean
gradientColors: ['#2E3192', '#1BFFFF']

// Sunset
gradientColors: ['#ff6b6b', '#feca57']

// Forest
gradientColors: ['#56ab2f', '#a8e063']

// Fire
gradientColors: ['#f12711', '#f5af19']

// Ice
gradientColors: ['#a8edea', '#fed6e3']

// Neon
gradientColors: ['#00f260', '#0575e6']

// Candy
gradientColors: ['#D31027', '#EA384D']

// Retro
gradientColors: ['#7F00FF', '#E100FF']
```

## Finding the Perfect Font

1. **Launch interactive preview**
   ```bash
   node examples/banner-preview.js YOURTEXT
   ```

2. **Browse categories** - Press 1-4 to switch between Modern, Classic, Decorative, Compact

3. **Navigate** - Use arrow keys to browse fonts

4. **Save config** - Press `s` to copy the config snippet when you find one you like

5. **Update config** - Paste into your `cli.config.js`

6. **Test it** - Run `node bin/dev-cli.js --help`

## Tips

- **Short text works best** - 3-8 characters ideal
- **ANSI Shadow** - Great for gradients
- **Slant** - Professional look
- **Small** - Good for long names
- **Star Wars** - Fun and unique
- **Standard** - Clean and readable
- **Test in terminal** - Some fonts require Unicode support

## All Available Fonts

Figlet includes 300+ fonts! Categories:

- **Modern** (23 fonts) - ANSI Shadow, Big, Slant, Doom, Speed, etc.
- **Classic** (15 fonts) - Banner, Shadow, Rounded, Doh, etc.
- **Decorative** (16 fonts) - Gothic, Graffiti, Fire Font, Star Wars, etc.
- **Compact** (13 fonts) - Small, Mini, Thin, Alpha, Binary, etc.
- **All** - 300+ total fonts!

Use the interactive preview to explore them all!

## Testing Your Banner

After changing config:

```bash
node bin/dev-cli.js --help
```

The banner will display at the top with your chosen font and colors!
