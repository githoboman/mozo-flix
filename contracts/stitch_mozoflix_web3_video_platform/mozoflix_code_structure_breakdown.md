# MOZOflix Front-End Architecture & Code Structure

## 1. Design System Configuration (Tailwind CSS)
Our theme is implemented using a custom Tailwind configuration to ensure pixel-perfect adherence to the "Cinematic Futurist" aesthetic.

```javascript
// tailwind.config.js
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
        display: ['"Bebas Neue"', 'cursive'], // Headlines
        ui: ['Syne', 'sans-serif'],           // Labels/Buttons
        sans: ['"DM Sans"', 'sans-serif'],    // Body
      },
      backgroundImage: {
        'orange-grid': "url('/assets/grid-overlay.svg')",
        'film-grain': "url('/assets/grain.png')",
      }
    }
  }
}
```

## 2. Core Global Components

### Primary Button
```html
<!-- Reusable UI Button -->
<button class="bg-brand text-black font-ui font-bold uppercase tracking-widest px-8 py-3 rounded-sm 
               hover:bg-brand-bright hover:shadow-[0_0_20px_rgba(255,107,0,0.4)] 
               transition-all duration-300 transform active:scale-95">
  Connect Wallet
</button>
```

### Reward Pill
```html
<!-- Watch-to-Earn Badge -->
<div class="bg-brand text-black font-ui font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1">
  <span>+0.5 STX</span>
</div>
```

## 3. Screen Structure Logic (Video Feed)
The `VideoFeed` component uses a standard CSS Grid with specific MOZO styling for card hover reveals.

```html
<section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
  <!-- Video Card Component -->
  <div class="group relative bg-surface border border-border rounded-xl overflow-hidden cursor-pointer">
    <div class="aspect-video relative">
      <img src="thumbnail.jpg" alt="Video title" class="object-cover w-full h-full">
      <div class="absolute bottom-2 right-2">
        <!-- Reward Pill -->
      </div>
    </div>
    <div class="p-4">
      <h3 class="font-display text-2xl text-white">THE FUTURE OF STACKS</h3>
      <p class="font-sans text-muted text-sm mt-1">Crypto Insights</p>
    </div>
    <!-- Hover Reveal Motif -->
    <div class="absolute bottom-0 left-0 w-0 h-[3px] bg-brand transition-all duration-500 group-hover:w-full"></div>
  </div>
</section>
```

## 4. Smart Contract Integration Mockup
The real-time log relies on event listening from Clarity smart contracts on the Stacks blockchain.

```javascript
// Mock event listener for on-chain rewards
const listenForRewards = (contractAddress) => {
  // Logic to poll or subscribe to Clarity events
  // When 'reward-distributed' event fires:
  // 1. Update UI state
  // 2. Trigger "Reward Unlocked" toast
  // 3. Append to Live Reward Log
};
```