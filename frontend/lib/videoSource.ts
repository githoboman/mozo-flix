/**
 * lib/videoSource.ts
 * Parse user-pasted URLs into a structured video source. Used by the upload
 * page when a creator picks "From YouTube" or "From X" instead of a file.
 */

import type { VideoSource } from "./manifest";

/**
 * Extract the 11-char video ID from any common YouTube URL shape:
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ
 *   https://www.youtube.com/embed/dQw4w9WgXcQ
 *   https://www.youtube.com/shorts/dQw4w9WgXcQ
 *   https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=12s
 */
export function parseYouTubeUrl(input: string): { id: string; url: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // youtu.be short link
  const m1 = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?youtu\.be\/([A-Za-z0-9_-]{11})/,
  );
  if (m1) return { id: m1[1]!, url: `https://youtu.be/${m1[1]}` };

  // youtube.com/watch?v=ID
  const m2 = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
  );
  if (m2)
    return {
      id: m2[1]!,
      url: `https://www.youtube.com/watch?v=${m2[1]}`,
    };

  // youtube.com/embed/ID or /shorts/ID
  const m3 = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/,
  );
  if (m3)
    return {
      id: m3[1]!,
      url: `https://www.youtube.com/watch?v=${m3[1]}`,
    };

  // Bare 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed))
    return { id: trimmed, url: `https://www.youtube.com/watch?v=${trimmed}` };

  return null;
}

/**
 * Extract the numeric post ID from any common X / Twitter URL shape:
 *   https://x.com/handle/status/1234567890
 *   https://twitter.com/handle/status/1234567890
 *   https://x.com/i/status/1234567890
 */
export function parseXUrl(input: string): { id: string; url: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const m = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.|m\.)?(?:twitter|x)\.com\/[^/]+\/status\/(\d{6,25})/,
  );
  if (m) return { id: m[1]!, url: `https://x.com/i/status/${m[1]}` };

  // Bare numeric ID
  if (/^\d{6,25}$/.test(trimmed))
    return { id: trimmed, url: `https://x.com/i/status/${trimmed}` };

  return null;
}

/** Build a YouTube embed URL with the params we want for the player. */
export function ytEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1`;
}

/** Build a VideoSource for the manifest. */
export function buildYouTubeSource(id: string, url: string): VideoSource {
  return { type: "youtube", youtubeId: id, url };
}
export function buildXSource(id: string, url: string): VideoSource {
  return { type: "x", postId: id, url };
}
