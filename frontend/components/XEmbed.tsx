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

let widgetsPromise: Promise<boolean> | null = null;

/**
 * Loads platform.twitter.com/widgets.js. Returns false when the script
 * fails to load — typical causes are ad blockers (uBlock, Brave Shields)
 * or corporate firewalls. Callers should show a fallback in that case.
 */
function loadTwitterWidgets(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.twttr?.widgets) return Promise.resolve(true);
  if (widgetsPromise) return widgetsPromise;
  widgetsPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://platform.twitter.com/widgets.js";
    tag.async = true;
    tag.onload = () => resolve(true);
    tag.onerror = () => {
      widgetsPromise = null; // allow retry next mount
      resolve(false);
    };
    // Hard timeout — Twitter sometimes returns 200 but never fires onload
    setTimeout(() => resolve(!!window.twttr?.widgets), 8000);
    document.head.appendChild(tag);
  });
  return widgetsPromise;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "blocked" } // widgets.js failed to load (ad blocker, network)
  | { kind: "missing" }; // tweet not found / protected / deleted

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [tabActive, setTabActive] = useState(
    typeof document !== "undefined" ? !document.hidden : true,
  );
  const [inView, setInView] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const firedRef = useRef(false);
  const loaded = load.kind === "ready";
  // X doesn't expose video playback state to embeds, so the closest proxy
  // for "viewer is actually watching" is: the embed is mounted, the tab is
  // focused, and the post is on screen. The timer pauses the moment any
  // of those flips false (scroll away, switch tab, etc.).
  const running = loaded && tabActive && inView;

  useEffect(() => {
    let cancel = false;
    (async () => {
      const scriptOk = await loadTwitterWidgets();
      if (cancel) return;
      if (!scriptOk || !window.twttr?.widgets || !mountRef.current) {
        setLoad({ kind: "blocked" });
        return;
      }
      mountRef.current.innerHTML = "";
      try {
        // createTweet resolves with the iframe element on success, or
        // undefined when the tweet is missing/protected/deleted.
        const el = await window.twttr.widgets.createTweet(
          postId,
          mountRef.current,
          { theme: "dark", dnt: true, align: "center" },
        );
        if (cancel) return;
        if (!el) {
          setLoad({ kind: "missing" });
        } else {
          setLoad({ kind: "ready" });
        }
      } catch {
        if (!cancel) setLoad({ kind: "missing" });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [postId]);

  // Track tab focus — pause the timer when user switches tabs.
  useEffect(() => {
    const onVis = () => setTabActive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Track on-screen visibility via IntersectionObserver — the timer pauses
  // if the user scrolls the embed off-screen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(!!entry && entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reset timer when post changes
  useEffect(() => {
    setElapsed(0);
    firedRef.current = false;
  }, [postId]);

  // Tick only when ALL of: loaded, user-started, tab active, in viewport.
  // X doesn't expose playback state to embeds, so this is the strongest
  // signal we can offer that the viewer is actually watching.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
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
  }, [running, thresholdSec, onReachedThreshold]);

  const pct = Math.min(100, (elapsed / thresholdSec) * 100);

  const postUrl = `https://x.com/i/status/${postId}`;

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-accent/20 bg-surface"
    >
      <div className="relative bg-black p-4">
        {/*
          X widgets render at a fixed pixel width (max ~550px), so we don't
          stretch the iframe — we just give it generous whitespace and a
          wider container, and let it center inside.
        */}
        <div
          ref={mountRef}
          className={`mx-auto min-h-[400px] w-full max-w-[600px] [&_iframe]:!mx-auto [&_iframe]:!w-full ${
            load.kind === "ready" ? "" : "invisible h-0"
          }`}
        />

        {load.kind === "loading" && (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
              <span className="font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
                Loading post from X…
              </span>
            </div>
          </div>
        )}

        {load.kind === "blocked" && (
          <FallbackPanel
            title="X embed blocked"
            body="Your browser or ad blocker is blocking platform.twitter.com. Disable shields for this site, or open the post directly."
            postUrl={postUrl}
          />
        )}

        {load.kind === "missing" && (
          <FallbackPanel
            title="Post unavailable"
            body="This post was deleted, the account is protected, or the embed isn't permitted. Try opening it on X directly."
            postUrl={postUrl}
          />
        )}
      </div>

      <div className="border-t border-white/5 px-4 py-3">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-bright shadow-[0_0_8px_rgba(255,107,0,0.7)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
          <span>X · engagement {Math.floor(pct)}%</span>
          <span>
            {!loaded
              ? "Embed loading"
              : !tabActive
                ? "Paused (tab inactive)"
                : !inView
                  ? "Paused (scrolled off-screen)"
                  : "Watching…"}{" "}
            · unlock at {thresholdSec}s
          </span>
        </div>
      </div>
    </div>
  );
}

function FallbackPanel({
  title,
  body,
  postUrl,
}: {
  title: string;
  body: string;
  postUrl: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="material-symbols-outlined text-[36px] text-accent">
        warning
      </span>
      <h3 className="font-display text-xl uppercase tracking-wide text-white">
        {title}
      </h3>
      <p className="max-w-md text-[12px] font-light leading-relaxed text-muted">
        {body}
      </p>
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 rounded bg-accent px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-accent-bright"
      >
        Open on X →
      </a>
    </div>
  );
}
