# MOZOflix Design Guidelines

Working design system for MOZOflix — a decentralized watch-to-earn video
platform on Stacks. Colors are locked; everything else in this document is
the source of truth for typography, spacing, iconography, layout,
navigation, and interactive states.

> If you're a designer, developer, or stakeholder adding UI: read this
> first, follow it strictly, and open a PR to this file if you have to
> deviate. Consistency is the single most compounding investment we can
> make in the product.

---

## 1. Design principles

1. **Content over chrome.** Every screen serves a video, an on-chain
   number, or a decision. Chrome (nav, headers, panels) should recede
   until the user needs it.
2. **Trust through transparency.** Any number we show — a reward, a pool
   balance, a fee — has a link to its source (an explorer tx, a
   contract, a doc page). No mystery data.
3. **Web3 without the theater.** Wallet addresses, tx hashes, and CIDs
   are truncated by default with a copy affordance. Never make a viewer
   read a 42-char hex to accomplish a task.
4. **AI as an assistant, never an author.** AI touchpoints must show
   their work (source data, thresholds, confidence) and always be
   overridable.
5. **Accessible by default.** Every interactive element has a visible
   focus ring, a real label, and touch targets ≥ 40px.

---

## 2. Color

Colors are locked. Do not add new hues. Refer to Tailwind classes below.

| Token       | Class            | Usage |
| ----------- | ---------------- | ----- |
| `bg`        | `bg-bg`          | Page background (near-black) |
| `surface`   | `bg-surface`     | Section backgrounds one step above `bg` |
| `card`      | `bg-card`        | Card surface |
| `card-2`    | `bg-card-2`      | Card hover surface |
| `accent`    | `text-accent`, `bg-accent` | Brand orange — reserved for CTAs, highlights, active states |
| `accent-bright` | `bg-accent-bright` | CTA hover |
| `accent-dim`| `bg-accent-dim`  | Subtle accent wash for badges/pills |
| `accent-border` | `border-accent-border` | Section dividers and card outlines |
| `muted`     | `text-muted`     | Secondary text, meta info |
| `white/85`  | `text-white/85`  | Body copy |
| `white`     | `text-white`     | Headings and primary text |

Never use raw hex values in components. Always the tokens above.

---

## 3. Typography

**Fonts (loaded in `app/layout.tsx`):**

- `--font-bebas` (Bebas Neue) → display, used via `font-display`
- `--font-syne` (Syne) → UI accents, used via `font-ui`
- `--font-dm-sans` (DM Sans) → body copy (default sans)

**Type scale — use these classes verbatim:**

| Purpose                | Class                                                    |
| ---------------------- | -------------------------------------------------------- |
| Hero H1                | `font-display text-[clamp(48px,9vw,140px)] leading-[0.92]` |
| Section H2             | `font-display text-[clamp(36px,5vw,64px)] leading-[1.02]` |
| Doc H1                 | `font-display text-[clamp(36px,5vw,56px)] leading-[1.05]` |
| Sub-heading (H3)       | `font-display text-[clamp(24px,3vw,32px)] leading-[1.15]` |
| UI label (H4-style)    | `font-ui text-[18px] font-bold uppercase tracking-[0.05em]` |
| Eyebrow                | `font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent` |
| Body prose             | `text-[15px] font-light leading-[1.75] text-white/85` |
| Body meta              | `text-[13px] font-light leading-[1.7] text-muted` |
| Chip / badge           | `font-ui text-[10px] font-bold uppercase tracking-[0.12em]` |
| Tx hash / address      | `font-mono` |

**Rules:**

- One `H1` per page. Every subsequent heading must nest properly (never
  skip levels).
- Body prose should never exceed **68ch** — cap with `max-w-[68ch]`.
- Never mix `font-display` and `font-ui` inside a single word (bad
  legibility).
- Always use `clamp()` for headings so mobile doesn't overflow.

---

## 4. Spacing

Every gap, padding, and margin is a multiple of **4px** (Tailwind's default).
Use these standard rhythms rather than one-off values:

| Purpose                  | Class            |
| ------------------------ | ---------------- |
| Section vertical padding | `py-16 md:py-24` |
| Section horizontal padding | `px-4 sm:px-6 md:px-12` |
| Card padding             | `p-6 md:p-8`     |
| Modal padding            | `p-6 sm:p-10`    |
| Stack gap (default)      | `gap-4`          |
| Related-item gap         | `gap-3`          |
| Section-to-section       | `mt-16` or `mt-24` |

Never write arbitrary padding values (`p-[19px]`, etc.). If the design
absolutely needs one, add it to this table first.

---

## 5. Iconography

- **Primary icon system: [Material Symbols Outlined](https://fonts.google.com/icons)**, loaded via the stylesheet in `app/layout.tsx`.
- Icon size classes: `text-[14px]` for inline, `text-[16px]` for chips, `text-[20-24px]` for buttons, `text-[36px]` for empty-state hero icons.
- Filled variant only for **active/selected** state (via `style={{ fontVariationSettings: "'FILL' 1" }}`).
- Emoji icons (👁💰🔗) are legacy — allowed inside existing "Cinematic Futurist" landing sections (How, Earn, Stacks) but not in any new component. Prefer Material Symbols for anything shipped after 2026-07.
- Always wrap decorative icons with `aria-hidden` when they're next to a text label.

---

## 6. Layout

**Container widths:**

- Prose (docs, marketing copy): `max-w-[68ch]` or `max-w-[720px]`
- Full-bleed sections (landing hero, cards): `max-w-[1200px]` or `max-w-[1600px]` for the app shell
- Video player column (watch page): `max-w-[1100px]` — feels theatre-mode without dwarfing the meta

**Breakpoints (Tailwind defaults):**

- `sm` 640px — phone landscape
- `md` 768px — tablet
- `lg` 1024px — desktop
- `xl` 1280px — wide desktop
- `2xl` 1536px — extra wide

**Grids drop to 1 column at the smallest breakpoint.** Cards never wrap
awkwardly; use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` patterns.

---

## 7. Navigation

- **LandingNav** on `/`, `/docs/*`, and any marketing route. Anchor links
  (`#how`, `#ai`, ...) show only on `/`. `Docs` and `Launch App` always
  show.
- **TopNav** on `/(app)/*` routes. Includes wallet state, notifications,
  search. `Docs` link included so the app doesn't lose users who want to
  read.
- **Sidebar** on doc pages (auto-generated from `DocsSidebar.tsx`) and on
  browse (categories).
- **Active state** is signaled by `text-accent` + `aria-current="page"`.

---

## 8. Interactive elements

**Buttons:**

- Primary CTA: `bg-accent text-black`, `font-ui text-[12-14px] font-bold uppercase tracking-[0.08em]`, `hover:-translate-y-0.5 hover:bg-accent-bright hover:shadow-glow-lg`, `transition`
- Secondary CTA: `border border-white/20 text-white`, `hover:border-accent hover:text-accent`
- Tertiary / link-like: `text-accent underline decoration-accent/40 underline-offset-4`
- Never use plain grey buttons — everything meaningful is orange-adjacent.

**Every interactive element must have:**

- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg`
- `type="button"` on any `<button>` that isn't a submit
- An accessible label (`aria-label`) if the visible content is only an icon
- A hover state distinguishable from rest (color, translate, shadow — pick one)

**Cards (`.card`):**

- Base: `rounded-xl border border-accent-border bg-card`
- Hover: `hover:border-accent/40 transition-colors`
- Padding: `p-6 md:p-8`
- Never use `hover:scale-…` on cards — trigger reflow noise. Use border
  color + subtle background instead.

**Modals:**

- Overlay: `bg-black/80 backdrop-blur-md`, `z-[200]`
- Panel: `rounded-2xl border border-accent/25 bg-card p-6 sm:p-10`
- Always trap ESC to close
- Focus the first interactive element on open
- Add `role="dialog"` and `aria-labelledby` linking to the modal H1

---

## 9. Consistency rules

- **Wallet addresses** always rendered via `<AddressChip>` — shortAddr + copy button + explorer link.
- **Tx hashes** always via `<TxChip>` — same treatment.
- **STX amounts** always via `formatStx(microValue)` — never inline division.
- **Video links** always via `watchUrl(id, title)` — produces `/watch/{id}/{slug}` for pretty URLs.
- **Loading skeletons** always match the eventual layout (never a lone spinner in place of a grid).
- **Error states** always show: what happened, why, what the user can do.

---

## 10. Accessibility (non-negotiable)

- Color contrast: body copy on `bg-card` must clear WCAG AA (4.5:1). We
  meet this with `text-white/85`; anything lighter than `text-white/60`
  is decorative only.
- Every image has `alt` text. Decorative images get `alt=""`.
- Every form input has an associated `<label>` (not just placeholder).
- Every interactive element is reachable + operable by keyboard.
- Videos are captioned when practical (roadmap; not required at MVP).
- Motion respects `prefers-reduced-motion` — heavy framer-motion effects
  are avoided by default.

---

## 11. Performance budget

- First-load JS per route: **≤ 200 KB** for marketing pages, **≤ 300 KB** for app pages. Watch page can go up to 320 KB (video player).
- No new dependency > 30 KB without a review. Prefer CSS animations over
  JS animation frames.
- Images through `next/image` with explicit `sizes`.
- Video thumbnails auto-generated from frames, capped at 1280px width.

---

## 12. Voice + copy

- **Direct, no hype.** "Earn STX for watching." > "Discover the future of decentralized entertainment!"
- **Numbers, not adjectives.** "70% completion gate" > "high completion threshold".
- **On-chain-native words.** "wallet", "pool", "tx", "verified view", "on-chain" — used correctly, always.
- **Never emojis in headings.** Fine sparingly in card content on the
  landing (legacy sections). Never in docs or app.

---

## 13. When you must break a rule

Every rule here is a default. If you break one, do it deliberately:

1. Note it in the PR description.
2. Add a code comment explaining the exception.
3. Consider whether the rule should be updated instead — if the
   exception recurs, it's actually a new pattern that belongs in this
   document.

---

_Last updated 2026-07. Owner: engineering-design pair. Amend via PR._
