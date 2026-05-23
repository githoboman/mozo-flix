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
        'orange-grid': "url('__IMG_STRIPPED__')",
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

## Step 4: Dashboard Implementations

### 4.1 Viewer Dashboard Stat Grid
```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
  <!-- Total Earned -->
  <div class="bg-surface-low border border-border p-8 rounded-sm relative overflow-hidden">
    <p class="font-ui text-xs text-muted uppercase tracking-[0.2em] mb-2">Total Earned</p>
    <div class="flex items-baseline gap-2">
      <h2 class="font-display text-7xl text-white tracking-tighter">4,291.50</h2>
      <span class="font-ui text-brand text-sm font-bold">MOZO</span>
    </div>
  </div>

  <!-- Withdrawable -->
  <div class="bg-surface-low border border-border p-8 rounded-sm relative overflow-hidden">
    <p class="font-ui text-xs text-muted uppercase tracking-[0.2em] mb-2">Withdrawable Balance</p>
    <div class="flex items-baseline gap-2">
      <h2 class="font-display text-7xl text-white tracking-tighter">1,050.25</h2>
    </div>
    <button class="mt-6 w-full bg-brand text-black font-ui font-bold uppercase tracking-widest py-3 rounded-sm hover:bg-brand-bright transition-all">
      Withdraw to Wallet
    </button>
  </div>

  <!-- Active Multiplier Card -->
  <div class="bg-gradient-to-br from-surface-mid to-brand/10 border border-brand/20 p-8 rounded-sm relative overflow-hidden">
    <div class="flex items-center gap-2 text-brand mb-4">
      <i class="material-icons text-sm">local_fire_department</i>
      <span class="font-ui text-[10px] font-bold uppercase tracking-widest">Active Multiplier</span>
    </div>
    <h2 class="font-display text-4xl text-white tracking-wider">2.5X EARNING RATE</h2>
    <div class="mt-6 w-full bg-white/5 h-1 rounded-full overflow-hidden">
      <div class="h-full bg-brand" style="width: 65%"></div>
    </div>
  </div>
</div>
```

### 4.2 Creator Campaign Management
```html
<!-- Campaign Row Item -->
<div class="bg-surface border border-border p-4 flex items-center justify-between hover:border-brand/30 transition-colors">
  <div class="flex items-center gap-6">
    <div class="w-32 aspect-video bg-surface-high rounded-sm overflow-hidden">
      <img src="thumb.jpg" class="w-full h-full object-cover opacity-50">
    </div>
    <div>
      <h4 class="font-display text-xl text-white tracking-wide">DeFi Fundamentals Part 1</h4>
      <p class="font-sans text-muted text-xs">Learn to Earn • 150 STX Pool</p>
    </div>
  </div>
  
  <div class="flex-1 max-w-xs px-12">
    <div class="flex justify-between font-ui text-[10px] text-muted uppercase mb-1">
      <span>45% Claimed</span>
      <span>68 STX Remaining</span>
    </div>
    <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
      <div class="h-full bg-brand" style="width: 45%"></div>
    </div>
  </div>

  <div class="flex gap-2">
    <button class="p-2 border border-white/10 text-white hover:border-brand transition-colors">
      <i class="material-icons text-sm">edit</i>
    </button>
    <button class="p-2 border border-white/10 text-white hover:border-brand transition-colors">
      <i class="material-icons text-sm">bar_chart</i>
    </button>
  </div>
</div>
```

## Step 5: Layout Motif (Ticker Tape)
```html
<div class="w-full bg-brand overflow-hidden py-1 border-y border-black/10">
  <div class="flex whitespace-nowrap animate-marquee">
    <span class="font-ui font-bold text-[10px] text-black mx-4 tracking-[0.3em] uppercase">
      Live: 14,231 Viewers Earning • Next Reward Epoch: 04:12:33 • Network Hash Rate: 14.2 EH/s
    </span>
  </div>
</div>
```
