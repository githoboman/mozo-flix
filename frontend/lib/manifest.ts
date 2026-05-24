/**
 * lib/manifest.ts
 * Off-chain video manifest stored on IPFS. The on-chain `content-hash` field
 * now points at the manifest CID (not the raw video). This lets every viewer
 * resolve `{title, description, videoCid}` without per-browser localStorage.
 *
 * Cached aggressively in localStorage — CIDs are content-addressed so the
 * cache never goes stale.
 */

import { ipfsToUrl } from "./ipfs";

/** v1 — IPFS-only. Kept for backward compat with existing on-chain videos. */
export type VideoManifestV1 = {
  schema: "mozoflix-video-v1";
  title: string;
  description: string;
  category?: string;
  videoCid: string;          // IPFS CID of the raw video file
  videoFormat?: "mp4" | "hls";
  thumbnailCid?: string;
  uploaderAddress: string;
  uploadedAt: number;
};

/**
 * v2 — extensible source descriptor. The `source` field tells the player
 * what kind of video this is and where to find it. Supported types:
 *   - ipfs:   `{ type: "ipfs", videoCid, videoFormat }`
 *   - youtube:`{ type: "youtube", youtubeId, url }`
 *   - x:      `{ type: "x", postId, url }`
 *
 * Adding new sources later (Vimeo, Twitch, Farcaster, etc.) is just a new
 * member of the discriminated union — no contract change needed.
 */
export type VideoSource =
  | { type: "ipfs"; videoCid: string; videoFormat?: "mp4" | "hls" }
  | { type: "youtube"; youtubeId: string; url: string }
  | { type: "x"; postId: string; url: string };

export type VideoManifestV2 = {
  schema: "mozoflix-video-v2";
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  thumbnailCid?: string;
  source: VideoSource;
  uploaderAddress: string;
  uploadedAt: number;
};

export type VideoManifest = VideoManifestV1 | VideoManifestV2;

/** Normalize either v1 or v2 manifest into a single shape callers can use. */
export function getSource(manifest: VideoManifest): VideoSource {
  if (manifest.schema === "mozoflix-video-v2") return manifest.source;
  return {
    type: "ipfs",
    videoCid: manifest.videoCid,
    videoFormat: manifest.videoFormat,
  };
}

const CACHE_KEY = "mozoflix:manifestCache";

function readCache(): Record<string, VideoManifest> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(data: Record<string, VideoManifest>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

/** Cache a manifest under its CID. Called immediately after pinning. */
export function cacheManifest(cid: string, manifest: VideoManifest) {
  const all = readCache();
  all[cid] = manifest;
  writeCache(all);
}

/** Pin a manifest to IPFS via our server route. Returns the CID. */
export async function pinManifest(
  manifest: VideoManifest,
): Promise<{ cid: string }> {
  const res = await fetch("/api/ipfs-pin-json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `mozoflix-${manifest.title.slice(0, 20)}.json`,
      payload: manifest,
    }),
  });
  if (!res.ok) {
    throw new Error(`Manifest pin failed: ${res.status}`);
  }
  const data = (await res.json()) as { cid: string };
  cacheManifest(data.cid, manifest);
  return data;
}

/**
 * IPFS gateways raced in parallel. The user's NEXT_PUBLIC_PINATA_GATEWAY
 * (or the Pinata default) is included first via ipfsToUrl, then community
 * gateways. Whichever responds first wins — so a slow/blocked Pinata
 * gateway no longer holds up the whole page.
 */
const FALLBACK_GATEWAYS = [
  "https://ipfs.io",
  "https://dweb.link",
  "https://w3s.link",
  "https://4everland.io",
];

async function tryGateway(
  url: string,
  timeoutMs: number,
): Promise<VideoManifest> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`gateway ${res.status}`);
  const data = (await res.json()) as Partial<VideoManifest>;
  const v1 = data?.schema === "mozoflix-video-v1" && (data as VideoManifestV1).videoCid;
  const v2 = data?.schema === "mozoflix-video-v2" && (data as VideoManifestV2).source;
  if (!v1 && !v2) throw new Error("not a mozoflix manifest");
  return data as VideoManifest;
}

/**
 * Fetch a manifest by CID, with localStorage cache and multi-gateway race.
 * Returns null only if every gateway fails.
 */
export async function fetchManifest(
  cid: string,
): Promise<VideoManifest | null> {
  if (!cid) return null;

  // Cache hit
  const cache = readCache();
  if (cache[cid]) return cache[cid];

  // Race all gateways in parallel — first success wins. Primary gets a
  // shorter timeout so it doesn't tie up resources if it's slow.
  const allUrls = [
    ipfsToUrl(cid),
    ...FALLBACK_GATEWAYS.map((g) => `${g}/ipfs/${cid}`),
  ];
  const manifest = await Promise.any(
    allUrls.map((u) => tryGateway(u, 6_000)),
  ).catch(() => null);

  if (manifest) {
    cache[cid] = manifest;
    writeCache(cache);
  }
  return manifest;
}

/**
 * Resolve the manifest CID from an on-chain content-hash string.
 * Returns null if the content-hash isn't a recognizable ipfs:// pointer.
 */
export function extractCid(contentHash: string | undefined): string | null {
  if (!contentHash) return null;
  if (contentHash.startsWith("ipfs://")) return contentHash.slice(7);
  return null;
}
