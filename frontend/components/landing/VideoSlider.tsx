"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listVideos, type VideoMeta } from "@/lib/stacks-reads";
import { microToStx } from "@/lib/stacks";
import { useResolvedVideoList } from "@/lib/useVideoList";
import { watchUrl } from "@/lib/format";

export function LandingVideoSlider() {
  const [videos, setVideos] = useState<VideoMeta[] | null>(null);

  useEffect(() => {
    listVideos().then((list) => {
      // Active videos only. Most recent first. Max 8.
      const items = list
        .filter((v) => v.active)
        .sort((a, b) => b.id - a.id)
        .slice(0, 8);
      setVideos(items);
    });
  }, []);

  const resolved = useResolvedVideoList(videos);
  const items = resolved ?? [];

  return (
    <section className="border-y border-accent-border bg-bg px-6 py-24 md:px-12">
      <div className="mb-2 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
        <span className="block h-0.5 w-8 bg-accent" />
        Now Earning
      </div>
      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <h2 className="font-display text-[clamp(44px,5vw,72px)] leading-[0.95] tracking-[0.02em]">
          LIVE ON-CHAIN
          <br />
          <span className="text-accent">RIGHT NOW</span>
        </h2>
        <Link
          href="/browse"
          className="font-ui text-[12px] uppercase tracking-[0.15em] text-accent hover:text-accent-bright"
        >
          Browse all →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-accent-border bg-card-2"
            >
              <div className="aspect-video animate-pulse bg-card" />
              <div className="space-y-2 p-4">
                <div className="h-4 animate-pulse rounded bg-card" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-card" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="-mx-6 overflow-x-auto px-6 pb-4 md:-mx-12 md:px-12">
          <div className="flex min-w-min gap-5">
            {items.map(({ video: v, title }) => {
              const seed = (title + v.id).length;
              const gradient = `linear-gradient(135deg, hsl(${(seed * 37) % 360},45%,18%), hsl(${(seed * 67) % 360},55%,8%))`;
              return (
                <Link
                  key={v.id}
                  href={watchUrl(v.id, title)}
                  className="card-reveal group block w-[300px] shrink-0 overflow-hidden rounded-xl border border-accent-border bg-card-2"
                >
                  <div
                    className="relative aspect-video"
                    style={{ background: gradient }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent" />
                    <div className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 font-ui text-[10px] font-bold tracking-[0.1em] text-black shadow-[0_0_15px_rgba(255,107,0,0.45)]">
                      +{microToStx(v.rewardPerView)} STX
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-white drop-shadow-lg">
                        play_circle
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-ui text-[14px] font-bold leading-snug transition group-hover:text-accent">
                      {title}
                    </h3>
                    <p className="mt-2 font-mono text-[10px] text-muted">
                      {v.creator.slice(0, 5)}…{v.creator.slice(-4)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
