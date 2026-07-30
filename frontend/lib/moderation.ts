/**
 * lib/moderation.ts
 * Client-side helpers to run a video file through automated content
 * moderation BEFORE it's pinned to IPFS or registered on-chain.
 *
 * Flow:
 *  1. extractSampleFrames(file) — reads the video in the browser via a
 *     hidden <video>, seeks to N evenly-spaced timestamps, and captures
 *     each frame to a JPEG at ≤ 640px so we don't ship huge payloads.
 *  2. moderateFrames(frames) — POSTs base64 frames to /api/moderate-frames
 *     which runs Claude Haiku vision and returns an allow/reject decision.
 */

export type ModerationDecision = {
  decision: "allow" | "reject";
  reasons: string[];
  confidence: number;
  scores: {
    nudity: number;
    gore: number;
    violence: number;
    drugs: number;
    hate_symbols: number;
  };
};

/**
 * Extract N evenly-spaced frames from a video file, returned as raw base64
 * (no data URL prefix) JPEGs suitable for the moderation API.
 */
export async function extractSampleFrames(
  file: File,
  count = 5,
  maxDim = 640,
): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video decode failed"));
    });

    // Choose N timestamps spaced through the middle 80% of the video —
    // avoids fade-ins and end cards that often trigger false positives.
    const dur = video.duration || 4;
    const startPct = 0.1;
    const endPct = 0.9;
    const timestamps = Array.from({ length: count }, (_, i) => {
      const pct = startPct + ((endPct - startPct) * i) / Math.max(1, count - 1);
      return Math.min(dur - 0.05, Math.max(0.05, pct * dur));
    });

    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d unavailable");

    const frames: string[] = [];
    for (const t of timestamps) {
      video.currentTime = t;
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("seek failed"));
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      // Strip the `data:image/jpeg;base64,` prefix
      frames.push(dataUrl.replace(/^data:image\/[^;]+;base64,/, ""));
    }

    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Send extracted frames to the server-side moderation endpoint.
 * Throws on network / auth errors; returns a decision otherwise.
 */
export async function moderateFrames(
  frames: string[],
): Promise<ModerationDecision> {
  const res = await fetch("/api/moderate-frames", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frames, mediaType: "image/jpeg" }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ??
        `Moderation service returned ${res.status}`,
    );
  }
  return data as ModerationDecision;
}

/**
 * Convenience wrapper: extract frames + run moderation in one call.
 * Returns the decision, ready for the caller to allow/block the upload.
 */
export async function moderateVideoFile(
  file: File,
): Promise<ModerationDecision> {
  const frames = await extractSampleFrames(file, 5);
  return await moderateFrames(frames);
}
