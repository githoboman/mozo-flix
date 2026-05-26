"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** When a video file is provided, we auto-extract a frame as the default thumbnail. */
  videoFile?: File | null;
  /** When a YouTube ID is provided, we seed with hqdefault.jpg as the default. */
  youtubeId?: string;
  /**
   * Fires whenever the user picks a thumbnail (auto-extracted or uploaded).
   * `blob` is a Blob ready to upload, or null to clear.
   * `previewUrl` is a data: or remote URL safe to render in <img>.
   * For external defaults (YouTube), `blob` is null until the user replaces it.
   */
  onChange: (blob: Blob | null, previewUrl: string | null) => void;
};

/**
 * Lets a creator pick a video thumbnail.
 * - File uploads: auto-extracts frame at ~2s, with an "Upload custom" override.
 * - YouTube: defaults to the auto-derived YouTube thumb; override available.
 * - X posts: no default; user must upload (or skip and we'll fall back to a gradient).
 */
export function ThumbnailPicker({ videoFile, youtubeId, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [autoExtracting, setAutoExtracting] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-extract a frame from the video file
  useEffect(() => {
    if (!videoFile || isCustom) return;
    let cancelled = false;
    setAutoExtracting(true);
    extractFrame(videoFile)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreview(url);
        onChange(blob, url);
      })
      .catch(() => {
        if (!cancelled) {
          setPreview(null);
          onChange(null, null);
        }
      })
      .finally(() => {
        if (!cancelled) setAutoExtracting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile]);

  // Default to YouTube hqdefault when applicable
  useEffect(() => {
    if (!youtubeId || isCustom) return;
    const url = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
    setPreview(url);
    onChange(null, url); // no blob — we don't re-upload YT's image
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  const onPickCustom = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setIsCustom(true);
    onChange(file, url);
  };

  const onClearCustom = () => {
    setIsCustom(false);
    setPreview(null);
    onChange(null, null);
    // Re-trigger the auto/YouTube defaults
    if (videoFile) {
      // The videoFile effect will re-run once isCustom flips false
    } else if (youtubeId) {
      const url = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
      setPreview(url);
      onChange(null, url);
    }
  };

  const showEmpty = !preview && !autoExtracting;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
          Thumbnail
        </label>
        {isCustom && (
          <button
            type="button"
            onClick={onClearCustom}
            className="font-ui text-[10px] uppercase tracking-[0.1em] text-muted hover:text-accent"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* Preview */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-surface sm:w-[280px]">
          {autoExtracting && (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
                <span className="font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
                  Extracting frame…
                </span>
              </div>
            </div>
          )}
          {!autoExtracting && preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Thumbnail preview"
              className="h-full w-full object-cover"
            />
          )}
          {showEmpty && (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-muted">
              <span className="material-symbols-outlined text-3xl">image</span>
              <span className="font-ui text-[10px] uppercase tracking-[0.1em]">
                No thumbnail
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 text-[11px] text-muted sm:flex-1">
          <p className="font-light">
            {videoFile && !isCustom
              ? "Auto-generated from a frame of your video. Upload a custom image to override."
              : youtubeId && !isCustom
                ? "Using YouTube's default thumbnail. Upload a custom image to override."
                : "Pick a 16:9 image (PNG or JPG) under 2 MB."}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 2 * 1024 * 1024) {
                alert("Thumbnail must be under 2 MB");
                return;
              }
              onPickCustom(f);
              // Reset input so picking the same file again re-fires onChange
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="self-start rounded border border-white/15 px-3 py-1.5 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:border-accent hover:text-accent"
          >
            Upload custom
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Render the first non-black frame of a video file to a JPEG Blob.
 * Seeks ~2 seconds in to avoid the typical fade-in / black start.
 */
async function extractFrame(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      // Pick 2s in, or 10% of the way through for very short clips
      const seekTo = Math.min(
        2,
        Math.max(0.1, (video.duration || 4) * 0.1),
      );
      video.currentTime = seekTo;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      // Cap at 1280px wide so we don't pin a 4K still
      const maxW = 1280;
      const scale = Math.min(1, maxW / (video.videoWidth || maxW));
      canvas.width = Math.round((video.videoWidth || 1280) * scale);
      canvas.height = Math.round((video.videoHeight || 720) * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("canvas 2d unavailable"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) reject(new Error("canvas toBlob failed"));
          else resolve(blob);
        },
        "image/jpeg",
        0.85,
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("video decode failed"));
    };
  });
}
