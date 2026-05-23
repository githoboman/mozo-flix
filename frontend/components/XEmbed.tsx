"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  postId: string;
  /** Seconds of attention needed before the reward fires. */
  thresholdSec?: number;
  onReachedThreshold?: (pct: number) => void;
};

// Twitter widgets API minimal typing
declare global {
  interface Window {
    twttr?: {
      ready: (cb: () => void) => void;
      widgets: {
        createTweet: (
          id: string,
          el: HTMLElement,
          opts?: Record<string, unknown>,
        ) => Promise<HTMLElement>;
        load?: (el?: HTMLElement) => void;
      };
    };
  }
}

let widgetsPromise: Promise<void> | null = null;
function loadTwitterWidgets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.twttr?.widgets) return Promise.resolve();
  if (widgetsPromise) return widgetsPromise;
  widgetsPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://platform.twitter.com/widgets.js";
    tag.async = true;
    tag.onload = () => resolve();
    document.head.appendChild(tag);
  });
  return widgetsPromise;
}

/**
 * X (formerly Twitter) doesn't expose video playback progress to embeds.
 * We approximate engagement with a tab-active timer: viewer must keep the
 * embed in view for `thresholdSec` to earn the reward.
 */
export function XEmbed({
  postId,
  thresholdSec = 30,
  onReachedThreshold,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const firedRef = useRef(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      await loadTwitterWidgets();
      if (cancel || !mountRef.current || !window.twttr) return;
      mountRef.current.innerHTML = "";
      window.twttr.widgets
        .createTweet(postId, mountRef.current, {
          theme: "dark",
          dnt: true,
          align: "center",
        })
        .then(() => !cancel && setLoaded(true))
        .catch(() => {});
    })();
    return () => {
      cancel = true;
    };
  }, [postId]);

  // Track tab focus — pause the timer when user switches tabs.
  useEffect(() => {
    const onVis = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Tick the engagement timer once the embed is loaded.
  useEffect(() => {
    if (!loaded) return;
    const t = setInterval(() => {
      if (!active) return;
      setElapsed((e) => {
        const next = e + 1;
        if (!firedRef.current && next >= thresholdSec) {
          firedRef.current = true;
          onReachedThreshold?.(100);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [loaded, active, thresholdSec, onReachedThreshold]);

  const pct = Math.min(100, (elapsed / thresholdSec) * 100);

  return (
    <div className="overflow-hidden rounded-xl border border-accent/20 bg-surface">
      <div className="bg-black p-2">
        <div ref={mountRef} className="min-h-[320px] [&_iframe]:!mx-auto" />
      </div>
      <div className="border-t border-white/5 px-4 py-2">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-bright shadow-[0_0_8px_rgba(255,107,0,0.7)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
          <span>X · engagement {Math.floor(pct)}%</span>
          <span>
            {active ? "Watching…" : "Paused (tab inactive)"} · unlock at{" "}
            {thresholdSec}s
          </span>
        </div>
      </div>
    </div>
  );
}
