"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  videoId: string;
  thresholdPct?: number;
  onReachedThreshold?: (pct: number) => void;
  onProgress?: (currentSec: number, durationSec: number) => void;
};

// Minimal typing for the IFrame API
type YTPlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
};
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { PLAYING: number; ENDED: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });
  return apiPromise;
}

export function YouTubePlayer({
  videoId,
  thresholdPct = 70,
  onReachedThreshold,
  onProgress,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const firedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    firedRef.current = false;
    let cancelled = false;

    (async () => {
      await loadYouTubeAPI();
      if (cancelled || !mountRef.current || !window.YT) return;

      // Reset DOM (in case strict-mode double-mounts in dev)
      mountRef.current.innerHTML = '<div id="yt-target" />';
      const target = mountRef.current.querySelector("#yt-target")!;

      playerRef.current = new window.YT.Player(target as HTMLElement, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: ({ target: p }) => {
            setDuration(p.getDuration());
          },
          onStateChange: ({ data, target: p }) => {
            if (!window.YT) return;
            if (data === window.YT.PlayerState.PLAYING) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = setInterval(() => {
                const cur = p.getCurrentTime();
                const dur = p.getDuration();
                if (!dur) return;
                setProgress((cur / dur) * 100);
                setDuration(dur);
                onProgress?.(cur, dur);
                if (!firedRef.current && (cur / dur) * 100 >= thresholdPct) {
                  firedRef.current = true;
                  onReachedThreshold?.(Math.floor((cur / dur) * 100));
                }
              }, 1000);
            } else {
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
              // Catch the "ended" case in case threshold was just below 70
              if (
                data === window.YT.PlayerState.ENDED &&
                !firedRef.current
              ) {
                firedRef.current = true;
                onReachedThreshold?.(100);
              }
            }
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="overflow-hidden rounded-xl border border-accent/20 bg-black shadow-[0_0_40px_rgba(255,107,0,0.15)]">
      <div className="relative aspect-video w-full">
        <div ref={mountRef} className="absolute inset-0">
          <div id="yt-target" />
        </div>
      </div>
      {/* Reward gate strip */}
      <div className="border-t border-white/5 bg-surface px-4 py-2">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="absolute left-0 right-0 top-0 z-10 h-full w-px bg-white/40"
            style={{ left: `${thresholdPct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-bright shadow-[0_0_8px_rgba(255,107,0,0.7)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
          <span>YouTube · {Math.floor(progress)}%</span>
          <span>
            Reward unlocks at {thresholdPct}%
            {duration ? ` · ${Math.round(duration)}s total` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
