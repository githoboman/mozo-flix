/**
 * lib/reports.ts
 * Server-side reports storage. Uses Vercel KV (Redis-compatible) when
 * available, falls back to an in-memory Map so local dev works out of
 * the box. Reports are the input to Layer 2 moderation:
 *   - viewers POST a report to /api/report-video
 *   - once 3+ unique wallets have reported a video, it's auto-hidden
 *   - admin can override via /studio/moderation
 *
 * The KV lives on the server only. Do NOT import this into a Client
 * Component — it references node-only APIs.
 */

export type Report = {
  videoId: number;
  reporterAddress: string;
  reason: string;
  detail?: string;
  createdAt: number;
};

export type ModerationAction = {
  videoId: number;
  action: "hide" | "unhide" | "flag-creator";
  adminAddress: string;
  reason?: string;
  createdAt: number;
};

/** Number of unique reporter wallets before a video auto-hides. */
export const AUTO_HIDE_THRESHOLD = 3;

// ---------- KV shim ----------

// Lazy-load @vercel/kv so bundlers don't complain if it's absent locally.
// Falls back to a Map-backed shim that resets on cold start.

type KvLike = {
  sadd: (key: string, ...members: string[]) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  hset: (
    key: string,
    values: Record<string, string | number>,
  ) => Promise<number>;
  hget: (key: string, field: string) => Promise<string | null>;
  hgetall: (key: string) => Promise<Record<string, string> | null>;
  lpush: (key: string, ...values: string[]) => Promise<number>;
  lrange: (key: string, start: number, stop: number) => Promise<string[]>;
  del: (key: string) => Promise<number>;
};

let kvPromise: Promise<KvLike | null> | null = null;

async function getKv(): Promise<KvLike | null> {
  if (kvPromise) return kvPromise;
  kvPromise = (async () => {
    // Skip @vercel/kv when the env vars aren't there — no point importing
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return null;
    }
    try {
      // Dynamic import via a variable string so TypeScript doesn't try
      // to type-resolve @vercel/kv at compile time. That keeps the
      // package optional — install it on Vercel to enable KV, skip it
      // locally to fall back to the in-memory Map shim.
      const modName = "@vercel/kv";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import(/* @vite-ignore */ modName)) as any;
      return mod.kv as KvLike;
    } catch {
      // Not installed
      return null;
    }
  })();
  return kvPromise;
}

// ---------- In-memory fallback ----------

type MemStore = {
  sets: Map<string, Set<string>>;
  hashes: Map<string, Map<string, string>>;
  lists: Map<string, string[]>;
};
// Persist across hot reloads in dev
const globalForMem = globalThis as unknown as { __mozoMem?: MemStore };
const mem: MemStore =
  globalForMem.__mozoMem ??
  (globalForMem.__mozoMem = {
    sets: new Map(),
    hashes: new Map(),
    lists: new Map(),
  });

function memSadd(key: string, members: string[]): number {
  const s = mem.sets.get(key) ?? new Set<string>();
  let added = 0;
  members.forEach((m) => {
    if (!s.has(m)) added++;
    s.add(m);
  });
  mem.sets.set(key, s);
  return added;
}

function memSmembers(key: string): string[] {
  return Array.from(mem.sets.get(key) ?? new Set<string>());
}

function memHset(key: string, values: Record<string, string | number>): number {
  const h = mem.hashes.get(key) ?? new Map<string, string>();
  Object.entries(values).forEach(([k, v]) => h.set(k, String(v)));
  mem.hashes.set(key, h);
  return 1;
}

function memHget(key: string, field: string): string | null {
  return mem.hashes.get(key)?.get(field) ?? null;
}

function memHgetall(key: string): Record<string, string> | null {
  const h = mem.hashes.get(key);
  if (!h) return null;
  const o: Record<string, string> = {};
  h.forEach((v, k) => (o[k] = v));
  return o;
}

function memLpush(key: string, values: string[]): number {
  const l = mem.lists.get(key) ?? [];
  const next = [...values.reverse(), ...l];
  mem.lists.set(key, next);
  return next.length;
}

function memLrange(key: string, start: number, stop: number): string[] {
  const l = mem.lists.get(key) ?? [];
  return l.slice(start, stop === -1 ? undefined : stop + 1);
}

function memDel(key: string): number {
  const removed =
    (mem.sets.delete(key) ? 1 : 0) +
    (mem.hashes.delete(key) ? 1 : 0) +
    (mem.lists.delete(key) ? 1 : 0);
  return removed;
}

async function op<T>(
  fn: (kv: KvLike) => Promise<T>,
  fallback: () => T,
): Promise<T> {
  const kv = await getKv();
  if (kv) {
    try {
      return await fn(kv);
    } catch {
      return fallback();
    }
  }
  return fallback();
}

// ---------- Public API ----------

const KEY_REPORTERS = (videoId: number) => `mozoflix:reports:reporters:${videoId}`;
const KEY_REPORTS_LIST = (videoId: number) => `mozoflix:reports:list:${videoId}`;
const KEY_HIDDEN = "mozoflix:reports:hidden";
const KEY_ACTIONS = "mozoflix:reports:actions";
const KEY_FLAGGED_CREATORS = "mozoflix:reports:flagged";

/**
 * Add a report. Returns whether this reporter has already reported (idempotent).
 * If crossing the auto-hide threshold, auto-adds the video to the hidden set.
 */
export async function addReport(r: Report): Promise<{
  accepted: boolean;
  uniqueReporters: number;
  autoHidden: boolean;
}> {
  const reporterKey = KEY_REPORTERS(r.videoId);
  const listKey = KEY_REPORTS_LIST(r.videoId);
  const reporter = r.reporterAddress.toLowerCase();

  const added = await op(
    async (kv) => await kv.sadd(reporterKey, reporter),
    () => memSadd(reporterKey, [reporter]),
  );

  if (added > 0) {
    const payload = JSON.stringify(r);
    await op(
      async (kv) => await kv.lpush(listKey, payload),
      () => memLpush(listKey, [payload]),
    );
    // Index for the admin dashboard listing
    await indexReportedVideo(r.videoId);
  }

  const uniqueReporters = await op(
    async (kv) => (await kv.smembers(reporterKey)).length,
    () => memSmembers(reporterKey).length,
  );

  let autoHidden = false;
  if (uniqueReporters >= AUTO_HIDE_THRESHOLD) {
    autoHidden = await hideVideo(r.videoId, {
      adminAddress: "system:auto",
      reason: "auto-hidden: report threshold reached",
    });
  }

  return { accepted: added > 0, uniqueReporters, autoHidden };
}

/** Return every report submitted for a given video. */
export async function getReportsForVideo(videoId: number): Promise<Report[]> {
  const raw = await op(
    async (kv) => await kv.lrange(KEY_REPORTS_LIST(videoId), 0, -1),
    () => memLrange(KEY_REPORTS_LIST(videoId), 0, -1),
  );
  const out: Report[] = [];
  for (const s of raw) {
    try {
      out.push(JSON.parse(s) as Report);
    } catch {
      // skip corrupt entries
    }
  }
  return out;
}

/** Snapshot: every videoId that currently has 1+ reports. */
export async function listReportedVideoIds(): Promise<number[]> {
  // Iterating KV without SCAN is painful — keep a simple index set.
  const raw = await op(
    async (kv) => await kv.smembers("mozoflix:reports:index"),
    () => memSmembers("mozoflix:reports:index"),
  );
  return raw.map((s) => Number(s)).filter((n) => !Number.isNaN(n));
}

/** Called by addReport() to keep the index up-to-date. */
async function indexReportedVideo(videoId: number) {
  await op(
    async (kv) => await kv.sadd("mozoflix:reports:index", String(videoId)),
    () => memSadd("mozoflix:reports:index", [String(videoId)]),
  );
}

/** Hide a video from platform surfaces. Doesn't touch the on-chain contract. */
export async function hideVideo(
  videoId: number,
  meta: { adminAddress: string; reason?: string },
): Promise<boolean> {
  const added = await op(
    async (kv) => await kv.sadd(KEY_HIDDEN, String(videoId)),
    () => memSadd(KEY_HIDDEN, [String(videoId)]),
  );
  await recordAction({
    videoId,
    action: "hide",
    adminAddress: meta.adminAddress,
    reason: meta.reason,
    createdAt: Date.now(),
  });
  return added > 0;
}

export async function unhideVideo(
  videoId: number,
  meta: { adminAddress: string; reason?: string },
): Promise<boolean> {
  const kv = await getKv();
  if (kv) {
    try {
      // @vercel/kv doesn't expose SREM in the shim, so we blank the whole
      // set and repopulate without this id. For MVP scale this is fine.
      const all = await kv.smembers(KEY_HIDDEN);
      await kv.del(KEY_HIDDEN);
      const remaining = all.filter((v) => v !== String(videoId));
      if (remaining.length) await kv.sadd(KEY_HIDDEN, ...remaining);
    } catch {
      // fall through to mem
    }
  } else {
    const s = mem.sets.get(KEY_HIDDEN);
    s?.delete(String(videoId));
  }
  await recordAction({
    videoId,
    action: "unhide",
    adminAddress: meta.adminAddress,
    reason: meta.reason,
    createdAt: Date.now(),
  });
  return true;
}

/** Every video the platform is refusing to show. */
export async function getHiddenVideoIds(): Promise<number[]> {
  const raw = await op(
    async (kv) => await kv.smembers(KEY_HIDDEN),
    () => memSmembers(KEY_HIDDEN),
  );
  return raw.map((s) => Number(s)).filter((n) => !Number.isNaN(n));
}

/** Flag a creator wallet so their future uploads get pre-review. */
export async function flagCreator(
  address: string,
  meta: { adminAddress: string; reason?: string; videoId: number },
): Promise<boolean> {
  const added = await op(
    async (kv) => await kv.sadd(KEY_FLAGGED_CREATORS, address.toLowerCase()),
    () => memSadd(KEY_FLAGGED_CREATORS, [address.toLowerCase()]),
  );
  await recordAction({
    videoId: meta.videoId,
    action: "flag-creator",
    adminAddress: meta.adminAddress,
    reason: meta.reason,
    createdAt: Date.now(),
  });
  return added > 0;
}

export async function getFlaggedCreators(): Promise<string[]> {
  return await op(
    async (kv) => await kv.smembers(KEY_FLAGGED_CREATORS),
    () => memSmembers(KEY_FLAGGED_CREATORS),
  );
}

/** Record every admin action for audit + transparency. */
async function recordAction(a: ModerationAction): Promise<void> {
  await op(
    async (kv) => await kv.lpush(KEY_ACTIONS, JSON.stringify(a)),
    () => memLpush(KEY_ACTIONS, [JSON.stringify(a)]),
  );
}

export async function getRecentActions(limit = 50): Promise<ModerationAction[]> {
  const raw = await op(
    async (kv) => await kv.lrange(KEY_ACTIONS, 0, limit - 1),
    () => memLrange(KEY_ACTIONS, 0, limit - 1),
  );
  const out: ModerationAction[] = [];
  for (const s of raw) {
    try {
      out.push(JSON.parse(s) as ModerationAction);
    } catch {
      // skip
    }
  }
  return out;
}

