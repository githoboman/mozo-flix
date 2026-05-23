/**
 * lib/videoMeta.ts
 * Off-chain metadata for videos (title, description, thumbnail, etc.).
 *
 * Storage backend: localStorage for now. Swap to Firestore later by
 * replacing the read/write functions — the public API stays the same.
 *
 * Keyed by on-chain video ID (from mozoflix-videos contract).
 */

export type VideoMetadata = {
  id: number;
  title: string;
  description: string;
  category?: string;
  thumbnail?: string;       // data URL or remote URL
  videoCid?: string;        // IPFS CID of the raw video file (or HLS playlist)
  videoFormat?: "mp4" | "hls"; // hint for the player
  uploadedAt: number;       // Date.now()
  uploaderAddress: string;
};

const KEY = "mozoflix:videoMeta";

function readAll(): Record<string, VideoMetadata> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, VideoMetadata>) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, VideoMetadata>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function setVideoMeta(meta: VideoMetadata) {
  const all = readAll();
  all[String(meta.id)] = meta;
  writeAll(all);
}

export function getVideoMeta(id: number): VideoMetadata | null {
  const all = readAll();
  return all[String(id)] ?? null;
}

export function getAllVideoMeta(): VideoMetadata[] {
  return Object.values(readAll());
}

export function deleteVideoMeta(id: number) {
  const all = readAll();
  delete all[String(id)];
  writeAll(all);
}
