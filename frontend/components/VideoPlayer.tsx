"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;                         // HTTPS URL — MP4 or .m3u8 HLS playlist
  /** Optional fallback URLs (e.g. other IPFS gateways). Tried in order on load error. */
  fallbackSrcs?: string[];
  poster?: string;
  thresholdPct?: number;              // when to fire onReachedThreshold (default 70)
  onReachedThreshold?: (pct: number) => void;
  onProgress?: (currentSec: number, durationSec: number) => void;
};

export function VideoPlayer({
  src,
  fallbackSrcs = [],
  poster,
  thresholdPct = 70,
  onReachedThreshold,
  onProgress,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hasFiredThreshold, setHasFiredThreshold] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gatewayIdx, setGatewayIdx] = useState(0);

  // Anti-fraud watch-time tracking:
  // We credit only deltas that look like normal playback (0 < dt < 1.5s).
  // Scrubbing forward, fast-forwarding, or reloading at the end no longer
  // counts toward the reward threshold. Reward fires on real watched %
  // (`watchedSec / duration`), not the scrub-position progress bar.
  const watchedSecRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [watchedPct, setWatchedPct] = useState(0);

  // All candidate URLs to try, in order.
  const candidates = [src, ...fallbackSrcs].filter(Boolean);
  const activeSrc = candidates[gatewayIdx] ?? src;

  // Reset the rotation when the underlying source changes.
  useEffect(() => {
    setGatewayIdx(0);
    setLoadError(null);
  }, [src]);

  // Attach HLS.js when the source is an .m3u8 playlist (and the browser can't
  // play it natively, e.g. anything other than Safari).
  useEffect(() => {
    if (!videoRef.current || !activeSrc) return;
    const video = videoRef.current;

    const isHls = activeSrc.toLowerCase().includes(".m3u8");
    const canPlayNatively = video.canPlayType("application/vnd.apple.mpegurl");

    let hls: { destroy: () => void } | null = null;
    let cancelled = false;

    if (isHls && !canPlayNatively) {
      (async () => {
        try {
          const { default: Hls } = await import("hls.js");
          if (cancelled) return;
          if (Hls.isSupported()) {
            const instance = new Hls();
            instance.loadSource(activeSrc);
            instance.attachMedia(video);
            hls = instance;
          } else {
            video.src = activeSrc;
          }
        } catch {
          video.src = activeSrc;
        }
      })();
    } else {
      video.src = activeSrc;
    }

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [activeSrc]);

  /** On <video> error: try the next gateway, or surface a useful message. */
  const onVideoError = () => {
    if (gatewayIdx < candidates.length - 1) {
      setGatewayIdx((i) => i + 1);
    } else {
      setLoadError(
        "Video file couldn't be fetched from any IPFS gateway. The file may be unpinned, or all gateways are rate-limiting. Try again in a moment.",
      );
    }
  };

  useEffect(() => {
    setHasFiredThreshold(false);
    watchedSecRef.current = 0;
    lastTimeRef.current = 0;
    setWatchedPct(0);
  }, [src]);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;

    // Credit only normal-playback deltas. HTML5 `timeupdate` fires roughly
    // every 250ms (~4× / s); buffer pauses can briefly push the gap to ~2s.
    // We accept up to 2.5s as "still playing" so jitter doesn't break the
    // tracker, while seeks (which jump 5+ seconds) are still rejected.
    const cur = v.currentTime;
    const dt = cur - lastTimeRef.current;
    if (dt > 0 && dt < 2.5) {
      watchedSecRef.current += dt;
    }
    lastTimeRef.current = cur;

    const watchPct = (watchedSecRef.current / v.duration) * 100;
    setWatchedPct(watchPct);
    setProgress((cur / v.duration) * 100); // scrub indicator (visual only)
    onProgress?.(v.currentTime, v.duration);

    if (!hasFiredThreshold && watchPct >= thresholdPct) {
      setHasFiredThreshold(true);
      onReachedThreshold?.(Math.floor(watchPct));
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const goFullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  const seekBy = (delta: number) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  };

  // Keyboard shortcuts (only when no input/textarea is focused)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      const v = videoRef.current;
      if (!v || !src) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "k") {
        e.preventDefault();
        togglePlay();
      } else if (k === "arrowright" || k === "l") {
        e.preventDefault();
        seekBy(5);
      } else if (k === "arrowleft" || k === "j") {
        e.preventDefault();
        seekBy(-5);
      } else if (k === "m") {
        e.preventDefault();
        toggleMute();
      } else if (k === "f") {
        e.preventDefault();
        goFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-accent/20 bg-black shadow-[0_0_40px_rgba(255,107,0,0.15)]">
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={onTimeUpdate}
        onError={onVideoError}
        className="h-full w-full bg-black object-contain"
      />

      {!playing && src && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 transition group-hover:bg-black/40"
        >
          <span
            className="material-symbols-outlined text-7xl text-accent drop-shadow-[0_0_20px_rgba(255,107,0,0.7)]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            play_circle
          </span>
          <div className="hidden font-ui text-[10px] uppercase tracking-[0.2em] text-white/60 md:block">
            <kbd className="rounded border border-white/20 px-1.5 py-0.5">Space</kbd> play
            <span className="mx-2">·</span>
            <kbd className="rounded border border-white/20 px-1.5 py-0.5">←/→</kbd> seek
            <span className="mx-2">·</span>
            <kbd className="rounded border border-white/20 px-1.5 py-0.5">M</kbd> mute
            <span className="mx-2">·</span>
            <kbd className="rounded border border-white/20 px-1.5 py-0.5">F</kbd> fullscreen
          </div>
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-5 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
        <div
          className="relative h-2 w-full cursor-pointer overflow-hidden rounded-full bg-white/20"
          onClick={(e) => {
            const v = videoRef.current;
            if (!v || !v.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
          }}
        >
          {/* Reward gate marker — visual reference for what % unlocks the reward */}
          <div
            className="absolute z-20 h-full w-px bg-white/60"
            style={{ left: `${thresholdPct}%` }}
            title={`${thresholdPct}% reward gate`}
          />
          {/* Scrub position — translucent so users can still see where the playhead is */}
          <div
            className="absolute z-[5] h-full bg-white/15 transition-all"
            style={{ width: `${progress}%` }}
          />
          {/* Real watched-time bar — this is the one that drives the reward */}
          <div
            className="relative z-10 h-full bg-gradient-to-r from-accent to-accent-bright shadow-[0_0_10px_rgba(255,107,0,0.8)] transition-all"
            style={{ width: `${Math.min(100, watchedPct)}%` }}
            title="Verified watch time"
          />
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-5">
            <button onClick={togglePlay} className="hover:text-accent">
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {playing ? "pause" : "play_arrow"}
              </span>
            </button>
            <button onClick={toggleMute} className="hover:text-accent">
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {muted ? "volume_off" : "volume_up"}
              </span>
            </button>
            <span className="font-ui text-[12px] text-white/80">
              {fmt(videoRef.current?.currentTime ?? 0)} / {fmt(duration)}
            </span>
            {hasFiredThreshold && (
              <span className="rounded bg-accent px-2 py-0.5 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-black">
                ✓ Reward unlocked
              </span>
            )}
          </div>
          <button onClick={goFullscreen} className="hover:text-accent">
            <span className="material-symbols-outlined text-2xl">fullscreen</span>
          </button>
        </div>
      </div>

      {!src && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted">
          <span className="material-symbols-outlined text-5xl">cloud_off</span>
          <div className="font-ui text-[12px] uppercase tracking-[0.1em]">
            No video source
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center">
          <span className="material-symbols-outlined text-5xl text-accent">
            warning
          </span>
          <h3 className="font-display text-xl uppercase tracking-wide text-white">
            Video unavailable
          </h3>
          <p className="max-w-md text-[12px] font-light leading-relaxed text-muted">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setGatewayIdx(0);
            }}
            className="mt-2 rounded bg-accent px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-accent-bright"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
