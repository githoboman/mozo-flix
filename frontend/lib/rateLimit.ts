/**
 * lib/rateLimit.ts
 * In-memory token-bucket rate limiter for Next.js API routes.
 *
 * Per-key (IP, wallet, etc.) refill at a fixed rate.
 * Survives within a single Node process — fine for single-instance prod;
 * swap for Redis-backed if/when you scale out.
 */

type Bucket = {
  tokens: number;
  lastRefill: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  /** Max requests in `windowMs`. Defaults to 5. */
  capacity?: number;
  /** Sliding window in ms. Defaults to 60_000 (1 min). */
  windowMs?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

export function takeToken(
  key: string,
  opts: RateLimitOptions = {},
): RateLimitResult {
  const capacity = opts.capacity ?? 5;
  const windowMs = opts.windowMs ?? 60_000;
  const refillPerMs = capacity / windowMs;
  const now = Date.now();

  let b = buckets.get(key);
  if (!b) {
    b = { tokens: capacity, lastRefill: now };
    buckets.set(key, b);
  }

  // Refill since last check
  const elapsed = now - b.lastRefill;
  b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerMs);
  b.lastRefill = now;

  if (b.tokens < 1) {
    const resetMs = Math.ceil((1 - b.tokens) / refillPerMs);
    return { allowed: false, remaining: 0, resetMs };
  }

  b.tokens -= 1;
  return {
    allowed: true,
    remaining: Math.floor(b.tokens),
    resetMs: 0,
  };
}

/** Cleans up keys that haven't been touched in 1 hour. Call periodically. */
export function reapStale() {
  const cutoff = Date.now() - 3_600_000;
  for (const [k, b] of buckets) {
    if (b.lastRefill < cutoff) buckets.delete(k);
  }
}

// Reap every 10 min to keep memory bounded
if (typeof setInterval !== "undefined") {
  setInterval(reapStale, 600_000).unref?.();
}
