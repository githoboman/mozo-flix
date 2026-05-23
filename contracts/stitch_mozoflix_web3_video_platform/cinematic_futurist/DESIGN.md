---
name: Cinematic Futurist
colors:
  surface: '#1d100a'
  surface-dim: '#1d100a'
  surface-bright: '#46362e'
  surface-container-lowest: '#170b06'
  surface-container-low: '#261812'
  surface-container: '#2b1c16'
  surface-container-high: '#362720'
  surface-container-highest: '#41312a'
  on-surface: '#f8ddd2'
  on-surface-variant: '#e2bfb0'
  inverse-surface: '#f8ddd2'
  inverse-on-surface: '#3d2d26'
  outline: '#a98a7d'
  outline-variant: '#5a4136'
  surface-tint: '#ffb693'
  primary: '#ffb693'
  on-primary: '#561f00'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#a04100'
  secondary: '#c7c4d9'
  on-secondary: '#2f2f3f'
  secondary-container: '#464556'
  on-secondary-container: '#b5b3c7'
  tertiary: '#9ccaff'
  on-tertiary: '#003257'
  tertiary-container: '#059eff'
  on-tertiary-container: '#003357'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#e3e0f5'
  secondary-fixed-dim: '#c7c4d9'
  on-secondary-fixed: '#1a1a29'
  on-secondary-fixed-variant: '#464556'
  tertiary-fixed: '#d0e4ff'
  tertiary-fixed-dim: '#9ccaff'
  on-tertiary-fixed: '#001d35'
  on-tertiary-fixed-variant: '#00497b'
  background: '#1d100a'
  on-background: '#f8ddd2'
  surface-variant: '#41312a'
typography:
  display-xl:
    fontFamily: Bebas Neue
    fontSize: 120px
    fontWeight: '400'
    lineHeight: '0.9'
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Bebas Neue
    fontSize: 80px
    fontWeight: '400'
    lineHeight: '0.95'
    letterSpacing: 0em
  h1:
    fontFamily: Bebas Neue
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.0'
    letterSpacing: 0.02em
  h2:
    fontFamily: Bebas Neue
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: 0.02em
  ui-label-lg:
    fontFamily: Syne
    fontSize: 16px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.2em
  ui-label-sm:
    fontFamily: Syne
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.15em
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.7'
    letterSpacing: 0em
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.7'
    letterSpacing: 0.01em
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '300'
    lineHeight: '1.6'
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 80px
  grid_unit: 60px
---

## Brand & Style

This design system establishes a premium, "Web3-native" cinematic experience. It merges high-end editorial aesthetics with the raw, structural energy of digital decentralization. The atmosphere is immersive and content-first, utilizing a deep-space palette punctuated by high-energy orange accents.

Visual interest is driven by texture and structural overlays rather than decorative fluff. A faint film-grain noise provides a tactile, analog quality to the digital surfaces, while a rhythmic 60px grid overlay maintains a sense of mathematical precision. The emotional response is one of exclusive access—sophisticated, bold, and authoritative.

## Colors

The palette is anchored in deep "After-Hours" blues and purples to ensure content imagery pops with maximum vibrance. The primary accent is a high-octane orange, used strategically for calls to action, interactive states, and structural highlights. 

To maintain a premium feel, avoid overusing the solid accent color; instead, lean on `accent-dim` for large containers and `accent-glow` for radial depth. The `border` color is a low-opacity derivative of the accent, ensuring that even structural lines feel part of the brand’s energetic field.

## Typography

The typographic system is built on a high-contrast hierarchy. 

**Bebas Neue** is reserved for headlines and heroic moments. It should be set with tight leading and almost no letter-spacing to create a "wall of text" impact characteristic of cinema posters.

**Syne** serves as the navigational and functional workhorse. It must always be set in uppercase with wide tracking (minimum 0.08em) to evoke a modern, Web3 architectural feel.

**DM Sans** handles all long-form content. Use the 300 weight for a lighter, more editorial feel in descriptions, ensuring the 1.7 line-height is strictly maintained for readability against the dark backgrounds.

## Layout & Spacing

The layout is governed by a strict 12-column grid that aligns with the visual 60px grid motif. Alignment should feel intentional and "snapped." 

Use the 60px `grid_unit` as the primary driver for vertical section spacing and outer page margins. This creates a rhythmic "ticker-tape" feel when moving down the page. Negative space is not just empty; it is a structural element often occupied by the subtle orange grid lines or radial glows to maintain depth.

## Elevation & Depth

Depth is created through tonal layering and light emission rather than traditional shadows. 

1.  **Base Layer:** The `#0A0A18` background with film-grain noise and the 60px grid overlay.
2.  **Surface Tier:** Containers use `#0F0F22` or `#14142E`. These are flat but defined by the `border` token (`rgba(255,107,0,0.12)`).
3.  **Active Depth:** Interactive elements utilize `accent-glow` (`rgba(255,107,0,0.35)`) as a radial background blur behind them, making them appear to emit light.
4.  **Floating Elements:** Use `#16162E` with a slightly more opaque border to indicate a higher z-index. 

Avoid drop shadows. Hierarchy is communicated through color luminosity and border definition.

## Shapes

The shape language is "Soft-Brutalist." It avoids extreme roundness in primary UI components to maintain a serious, premium edge.

- **Buttons** are nearly sharp (4px) to feel industrial and precise.
- **Cards** use a more generous radius (12–20px) to frame content imagery comfortably.
- **Pills** are reserved specifically for status indicators or metadata tags, providing a high-contrast shape change against the rectangular grid.

## Components

### Buttons
Primary buttons use the solid `accent` color with black or white text and a 4px radius. On hover, the `accent-bright` color replaces the background, and a 3px `accent` underline appears 4px below the button container.

### Inputs & Fields
Inputs use `surface-2` with an 8px radius and a subtle `border`. On focus, the border opacity increases, and the `accent-glow` appears behind the input field. Labels must use **Syne** in uppercase.

### Cards
Cards use the `card` or `card-2` colors. Content cards should feature a subtle gradient overlay at the bottom to ensure white text is legible over imagery. Hovering on a card should reveal the 3px orange underline at the bottom edge.

### Ticker-Tape Band
A signature component: a full-width horizontal band using `accent` or `surface-2` that scrolls metadata, titles, or "Live" status indicators in **Syne** bold.

### Hover States
The "Reveal" motif is central. Interactive text links and cards should not have underlines by default; on hover, a 3px solid orange line should animate from 0% to 100% width.