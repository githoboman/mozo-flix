/**
 * lib/watchHistory.ts
 * Per-viewer watch history backed by localStorage.
 * Swap for Firestore later — the public API stays the same.
 */

export type WatchEntry = {
  videoId: number;
  progress: number;   // seconds watched
  duration: number;   // total seconds
  completedAt?: number;
  updatedAt: number;
};

const KEY = "mozoflix:watchHistory";

function readAll(): Record<string, WatchEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, WatchEntry>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function recordWatch(entry: WatchEntry) {
  const all = readAll();
  all[String(entry.videoId)] = entry;
  writeAll(all);
}

export function getWatchEntry(videoId: number): WatchEntry | null {
  return readAll()[String(videoId)] ?? null;
}

export function getAllWatchHistory(): WatchEntry[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getContinueWatching(): WatchEntry[] {
  return getAllWatchHistory().filter(
    (e) => !e.completedAt && e.progress > 0 && e.progress < e.duration * 0.95,
  );
}

export function getLikedVideos(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("mozoflix:liked") ?? "[]");
  } catch {
    return [];
  }
}

export function toggleLike(videoId: number): boolean {
  if (typeof window === "undefined") return false;
  const liked = getLikedVideos();
  const idx = liked.indexOf(videoId);
  if (idx >= 0) {
    liked.splice(idx, 1);
    localStorage.setItem("mozoflix:liked", JSON.stringify(liked));
    return false;
  }
  liked.push(videoId);
  localStorage.setItem("mozoflix:liked", JSON.stringify(liked));
  return true;
}

export function getWatchLater(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("mozoflix:watchLater") ?? "[]");
  } catch {
    return [];
  }
}

export function toggleWatchLater(videoId: number): boolean {
  if (typeof window === "undefined") return false;
  const list = getWatchLater();
  const idx = list.indexOf(videoId);
  if (idx >= 0) {
    list.splice(idx, 1);
    localStorage.setItem("mozoflix:watchLater", JSON.stringify(list));
    return false;
  }
  list.push(videoId);
  localStorage.setItem("mozoflix:watchLater", JSON.stringify(list));
  return true;
}
