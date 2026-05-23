"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;                         // HTTPS URL — MP4 or .m3u8 HLS playlist
  poster?: string;
  thresholdPct?: number;              // when to fire onReachedThreshold (default 70)
  onReachedThreshold?: (pct: number) => void;
  onProgress?: (currentSec: number, durationSec: number) => void;
};

export function VideoPlayer({
  src,
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

  // Attach HLS.js when the source is an .m3u8 playlist (and the browser can't
  // play it natively, e.g. anything other than Safari).
  useEffect(() => {
    if (!videoRef.current || !src) return;
    const video = videoRef.current;

    const isHls = src.toLowerCase().includes(".m3u8");
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
            instance.loadSource(src);
            instance.attachMedia(video);
            hls = instance;
          } else {
            video.src = src;
          }
        } catch {
          video.src = src;
        }
      })();
    } else {
      video.src = src;
    }

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  useEffect(() => {
    setHasFiredThreshold(false);
  }, [src]);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = (v.currentTime / v.duration) * 100;
    setProgress(pct);
    onProgress?.(v.currentTime, v.duration);
    if (!hasFiredThreshold && pct >= thresholdPct) {
      setHasFiredThreshold(true);
      onReachedThreshold?.(Math.floor(pct));
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
          <div
            className="absolute z-20 h-full w-px bg-white/60"
            style={{ left: `${thresholdPct}%` }}
            title={`${thresholdPct}% reward gate`}
          />
          <div
            className="relative z-10 h-full bg-gradient-to-r from-accent to-accent-bright shadow-[0_0_10px_rgba(255,107,0,0.8)] transition-all"
            style={{ width: `${progress}%` }}
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
    </div>
  );
}
