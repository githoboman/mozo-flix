/**
 * lib/format.ts
 * Consistent number / address / time formatting across the app.
 */

/** Format µSTX (1e6) → "1.5", "1,250", "0.5". Trims trailing zeros. */
export function formatStx(micro: bigint | number, opts: { compact?: boolean } = {}): string {
  const n = typeof micro === "bigint" ? Number(micro) : micro;
  const stx = n / 1_000_000;
  if (opts.compact && stx >= 1_000) {
    if (stx >= 1_000_000) return `${(stx / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    return `${(stx / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  // 0 → "0", whole → "12", decimal → "1.5" (max 6dp, trimmed)
  if (stx === 0) return "0";
  if (Number.isInteger(stx)) {
    return stx >= 1_000 ? stx.toLocaleString("en-US") : String(stx);
  }
  const fixed = stx.toFixed(6).replace(/\.?0+$/, "");
  // Add thousand separators for the integer part
  const [int, dec] = fixed.split(".");
  const intFmt = Number(int).toLocaleString("en-US");
  return dec ? `${intFmt}.${dec}` : intFmt;
}

/** Format an arbitrary big number with thousand separators. */
export function formatNumber(n: number | bigint): string {
  return Number(n).toLocaleString("en-US");
}

/**
 * Turn a video title into a URL-safe slug. Lower-cased, ASCII letters/digits
 * only, hyphen-separated, max 60 chars. Returns an empty string for falsy/
 * untitled videos (so callers don't end up with a trailing slash).
 *
 *   "Bitcoin Advice You Need Now!"  -> "bitcoin-advice-you-need-now"
 *   "Stacks 🟧 Nakamoto"            -> "stacks-nakamoto"
 *   ""                              -> ""
 */
export function slugify(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, ""); // trim if the slice landed mid-word
}

/**
 * Canonical URL for a video. ID is the source of truth; slug is decorative
 * and ignored by the router. Falls back to `/watch/{id}` when no title is
 * available (yet).
 */
export function watchUrl(id: number | string, title?: string | null): string {
  const slug = slugify(title ?? "");
  return slug ? `/watch/${id}/${slug}` : `/watch/${id}`;
}

/** Short address: SP12…AB34 */
export function shortAddress(addr: string | null | undefined, head = 4, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** Short tx hash: 0x4f3a…b9c2 */
export function shortTx(tx: string | null | undefined): string {
  if (!tx) return "";
  const h = tx.startsWith("0x") ? tx : `0x${tx}`;
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

/** Relative time: "2m", "1h", "3d". */
export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return "soon";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}

/** Block height to approximate calendar time. ~10 min per block on Stacks. */
export function blocksToTime(blocks: number): string {
  const mins = blocks * 10;
  if (mins < 60) return `${mins} min`;
  const h = mins / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

/** Hiro Explorer tx URL. */
export function explorerTxUrl(tx: string): string {
  const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";
  const chain = isMainnet ? "mainnet" : "testnet";
  const h = tx.startsWith("0x") ? tx : `0x${tx}`;
  return `https://explorer.hiro.so/txid/${h}?chain=${chain}`;
}

/** Hiro Explorer address URL. */
export function explorerAddressUrl(addr: string): string {
  const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";
  const chain = isMainnet ? "mainnet" : "testnet";
  return `https://explorer.hiro.so/address/${addr}?chain=${chain}`;
}
