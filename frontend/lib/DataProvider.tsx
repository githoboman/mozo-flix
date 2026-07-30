"use client";

/**
 * lib/DataProvider.tsx
 * Central cache for on-chain reads so pages don't all hammer the proxy with
 * the same listVideos/getPool calls on every navigation.
 *
 * - Caches the full video list for 30s by default
 * - Caches per-video pool state for 30s
 * - Exposes a manual invalidate() to bust the cache after a write
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  listVideos as readListVideos,
  getPool as readGetPool,
  type VideoMeta,
  type PoolState,
} from "./stacks-reads";
import { reconcilePendingUploads } from "./pendingUploads";

const CACHE_MS = 30_000;
const HIDDEN_CACHE_MS = 15_000;

/**
 * Fetch the platform's hidden video id set. Failures are non-fatal — we
 * fail-open (show all videos) if the moderation service is unreachable,
 * to prevent a downed KV from breaking discovery.
 */
async function fetchHiddenIds(): Promise<Set<number>> {
  try {
    const res = await fetch("/api/moderation/hidden");
    if (!res.ok) return new Set();
    const data = (await res.json()) as { ids: number[] };
    return new Set(Array.isArray(data.ids) ? data.ids : []);
  } catch {
    return new Set();
  }
}

type Cached<T> = { value: T; expires: number };

type DataContextValue = {
  /** Returns cached video list or fetches if stale. */
  getVideos: (opts?: { force?: boolean }) => Promise<VideoMeta[]>;
  /** Returns cached pool state for a video or fetches if stale. */
  getPool: (videoId: number, opts?: { force?: boolean }) => Promise<PoolState>;
  /** Bust everything (call after fund/upload/deactivate). */
  invalidate: () => void;
  /** Hot-cached video list — null until first fetch. */
  videos: VideoMeta[] | null;
  videosLoading: boolean;
};

const Ctx = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const videoCache = useRef<Cached<VideoMeta[]> | null>(null);
  const hiddenCache = useRef<Cached<Set<number>> | null>(null);
  const poolCache = useRef<Map<number, Cached<PoolState>>>(new Map());
  const inflight = useRef<{ videos: Promise<VideoMeta[]> | null }>({
    videos: null,
  });

  const [videos, setVideos] = useState<VideoMeta[] | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);

  const getVideos = useCallback(
    async ({ force = false } = {}) => {
      const now = Date.now();
      if (!force && videoCache.current && videoCache.current.expires > now) {
        return videoCache.current.value;
      }
      if (inflight.current.videos) return inflight.current.videos;

      setVideosLoading(true);
      // Fetch the on-chain list AND the platform's hidden set in parallel.
      // Filter the hidden ids out so no downstream consumer (browse grid,
      // channel page, recommendations, search) has to know moderation
      // exists — hidden videos simply don't appear.
      const p = Promise.all([
        readListVideos(),
        force || !hiddenCache.current || hiddenCache.current.expires <= now
          ? fetchHiddenIds()
          : Promise.resolve(hiddenCache.current.value),
      ])
        .then(([rawList, hidden]) => {
          hiddenCache.current = {
            value: hidden,
            expires: now + HIDDEN_CACHE_MS,
          };
          const list = rawList.filter((v) => !hidden.has(v.id));
          videoCache.current = { value: list, expires: now + CACHE_MS };
          setVideos(list);
          setVideosLoading(false);
          inflight.current.videos = null;
          // Remove any pending upload rows now that they're on-chain
          reconcilePendingUploads(rawList.map((v) => v.id));
          return list;
        })
        .catch((e) => {
          setVideosLoading(false);
          inflight.current.videos = null;
          throw e;
        });
      inflight.current.videos = p;
      return p;
    },
    [],
  );

  const getPool = useCallback(
    async (videoId: number, { force = false } = {}) => {
      const now = Date.now();
      const cached = poolCache.current.get(videoId);
      if (!force && cached && cached.expires > now) return cached.value;
      const pool = await readGetPool(videoId);
      poolCache.current.set(videoId, { value: pool, expires: now + CACHE_MS });
      return pool;
    },
    [],
  );

  const invalidate = useCallback(() => {
    videoCache.current = null;
    poolCache.current.clear();
    inflight.current.videos = null;
    setVideos(null);
  }, []);

  // Prime the cache once on mount so /browse, /studio, TopNav all share it
  useEffect(() => {
    getVideos().catch(() => {});
  }, [getVideos]);

  return (
    <Ctx.Provider
      value={{ getVideos, getPool, invalidate, videos, videosLoading }}
    >
      {children}
    </Ctx.Provider>
  );
}
