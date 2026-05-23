# MOZOflix Implementation Guide: Step-by-Step Code

This guide provides the core code blocks needed to implement the MOZOflix UI, following the "Cinematic Futurist" design system.

## Step 1: Tailwind CSS Configuration
Copy this into your `tailwind.config.js` to establish the brand tokens.

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF6B00', // MOZO Orange
          bright: '#FF8C33',
          dim: 'rgba(255, 107, 0, 0.15)',
          glow: 'rgba(255, 107, 0, 0.35)',
        },
        space: '#0A0A18', // Deep Space Background
        surface: {
          DEFAULT: '#0F0F22',
          low: '#111128',
          mid: '#14142E',
          high: '#16162E',
        },
        muted: '#8888A8',
        border: 'rgba(255, 107, 0, 0.12)',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'], // Headlines (Condensed All-Caps)
        ui: ['Syne', 'sans-serif'],           // Labels/Buttons (Wide Tracking)
        sans: ['"DM Sans"', 'sans-serif'],    // Body (Clean & Readable)
      },
      backgroundImage: {
        'orange-grid': "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNNjAgMEgwVjYwaDYwVjB6TTEgMXY1OGg1OFYxSDF6IiBmaWxsPSIjRkY2QjAwIiBmaWxsLW9wYWNpdHk9Ii4wOCIvPjwvZz48L3N2Zz4=')",
      }
    }
  }
}
```

## Step 2: Global UI Components

### 2.1 Primary Action Button
```html
<button class="bg-brand text-black font-ui font-bold uppercase tracking-[0.15em] px-8 py-3 rounded-sm 
               hover:bg-brand-bright hover:shadow-[0_0_20px_rgba(255,107,0,0.4)] 
               transition-all duration-300 transform active:scale-95">
  Connect Wallet
</button>
```

### 2.2 Reward Pill
```html
<div class="bg-brand text-black font-ui font-bold text-[10px] tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
  <span>+0.5 STX</span>
</div>
```

### 2.3 Progress Bar (70% Unlock Logic)
```html
<div class="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
  <!-- The width should be dynamic based on video progress -->
  <div class="h-full bg-gradient-to-r from-brand to-brand-bright shadow-[0_0_10px_rgba(255,107,0,0.5)]" 
       style="width: 70%"></div>
</div>
```

## Step 3: Screen-Specific Structures

### 3.1 Video Card (Feed Screen)
```html
<div class="group relative bg-surface border border-border rounded-xl overflow-hidden cursor-pointer transition-all hover:border-brand/40">
  <div class="aspect-video relative">
    <img src="thumb.jpg" class="object-cover w-full h-full">
    <div class="absolute bottom-2 right-2">
      <!-- Reward Pill -->
    </div>
  </div>
  <div class="p-4">
    <h3 class="font-display text-2xl text-white tracking-wider">THE FUTURE OF STACKS</h3>
    <p class="font-sans text-muted text-sm mt-1">Crypto Insights • 14K views</p>
  </div>
  <!-- Hover Reveal Motif -->
  <div class="absolute bottom-0 left-0 w-0 h-[3px] bg-brand transition-all duration-500 group-hover:w-full"></div>
</div>
```

### 3.2 Reward Log Row (Player Screen)
```html
<div class="flex items-center justify-between p-3 border-b border-white/5 bg-white/[0.02]">
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
      <i class="material-icons text-muted text-sm">person_outline</i>
    </div>
    <div>
      <p class="font-ui text-[10px] text-white uppercase tracking-wider">USER0X99 TIPPED</p>
      <p class="font-sans text-[10px] text-muted">"Great breakdown!"</p>
    </div>
  </div>
  <p class="font-display text-brand text-lg">+1.50 STX</p>
</div>
```

### 3.3 Dashboard Stat Card
```html
<div class="bg-surface-low border border-border p-6 rounded-sm relative overflow-hidden">
  <div class="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
  <p class="font-ui text-xs text-muted uppercase tracking-[0.2em] mb-2">Total Earned</p>
  <div class="flex items-baseline gap-2">
    <h2 class="font-display text-6xl text-white tracking-tighter">4,291.50</h2>
    <span class="font-ui text-brand text-sm font-bold">MOZO</span>
  </div>
</div>
```

## Step 4: Layout Motif (Ticker Tape)
```html
<div class="w-full bg-brand overflow-hidden py-1 border-y border-black/10">
  <div class="flex whitespace-nowrap animate-marquee">
    <span class="font-ui font-bold text-[10px] text-black mx-4 tracking-[0.3em] uppercase">
      Live: 14,231 Viewers Earning • Next Reward Epoch: 04:12:33 • Network Hash Rate: 14.2 EH/s
    </span>
    <!-- Repeat for seamless loop -->
  </div>
</div>
```
