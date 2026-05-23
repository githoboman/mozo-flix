"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listVideos } from "@/lib/stacks-reads";
import { recommend, type ScoredVideo } from "@/lib/recommendations";
import { microToStx } from "@/lib/stacks";
import { useResolvedVideoList } from "@/lib/useVideoList";
import { SpotlightCard } from "./ui/spotlight-card";

export function RecommendedRail({
  excludeIds = [],
  limit = 8,
  title = "For You",
  subtitle = "AI-curated from your watch history",
  compact = false,
}: {
  excludeIds?: number[];
  limit?: number;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const [recs, setRecs] = useState<ScoredVideo[] | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const all = await listVideos();
        if (cancel) return;
        const active = all.filter((v) => v.active);
        // Score a wider pool so we still hit `limit` after dropping legacy entries
        const ranked = recommend(active, new Set(excludeIds), limit * 2);
        setRecs(ranked);
      } catch {
        if (!cancel) setRecs([]);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(excludeIds), limit]);

  const resolved = useResolvedVideoList(
    recs ? recs.map((r) => r.video) : null,
  );

  // Drop legacy entries that never got a manifest published.
  // We only show videos whose IPFS manifest successfully resolved — that's our
  // signal that the title was set deliberately by the creator (vs seeded from
  // a stale localStorage entry).
  const display = (() => {
    if (!recs || !resolved) return null;
    // If we're still mid-fetch (any item not yet resolved), keep showing
    // the loading skeleton instead of an empty rail.
    const stillFetching = resolved.some((r) => !r.manifestResolved);
    if (stillFetching) return null;
    const out: Array<{ rec: ScoredVideo; title: string }> = [];
    for (let i = 0; i < recs.length; i++) {
      const item = resolved[i];
      if (!item || !item.manifestResolved) continue;
      out.push({ rec: recs[i], title: item.title });
      if (out.length >= limit) break;
    }
    return out;
  })();

  if (display === null) {
    return (
      <div className="my-8">
        <Header title={title} subtitle={subtitle} />
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[180px] w-[280px] shrink-0 animate-pulse rounded-xl bg-card-2"
            />
          ))}
        </div>
      </div>
    );
  }

  if (display.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">{title}</h3>
          <span className="font-ui text-[9px] uppercase tracking-[0.15em] text-accent">
            AI
          </span>
        </div>
        {display.map(({ rec, title: t }) => (
          <CompactCard key={rec.video.id} rec={rec} title={t} />
        ))}
      </div>
    );
  }

  return (
    <section className="my-8">
      <Header title={title} subtitle={subtitle} />
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:-mx-12 md:px-12">
        {display.map(({ rec, title: t }) => (
          <RailCard key={rec.video.id} rec={rec} title={t} />
        ))}
      </div>
    </section>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <div className="mb-1 flex items-center gap-2 font-ui text-[10px] uppercase tracking-[0.2em] text-accent">
          <span className="material-symbols-outlined text-[14px]">
            auto_awesome
          </span>
          AI Picks
        </div>
        <h2 className="font-display text-h2 leading-none">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-[12px] font-light text-muted">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function RailCard({ rec, title }: { rec: ScoredVideo; title: string }) {
  const v = rec.video;
  const seed = (title + v.id).length;
  const gradient = `linear-gradient(135deg, hsl(${(seed * 37) % 360},45%,18%), hsl(${(seed * 67) % 360},55%,8%))`;
  return (
    <SpotlightCard className="w-[260px] shrink-0 snap-start">
      <Link href={`/watch/${v.id}`} className="block">
        <div
          className="relative aspect-video"
          style={{ background: gradient }}
        >
          <div className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-0.5 font-ui text-[10px] font-bold text-black shadow-[0_0_12px_rgba(255,107,0,0.5)]">
            +{microToStx(v.rewardPerView)} STX
          </div>
          <div className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-0.5 font-ui text-[9px] uppercase tracking-[0.1em] text-accent backdrop-blur-sm">
            Match {Math.round(rec.score * 100)}%
          </div>
        </div>
        <div className="p-4">
          <h3 className="mb-1 line-clamp-2 font-ui text-[14px] font-bold text-white group-hover:text-accent">
            {title}
          </h3>
          {rec.reasons[0] && (
            <p className="line-clamp-1 text-[11px] font-light text-muted">
              ✨ {rec.reasons[0]}
            </p>
          )}
        </div>
      </Link>
    </SpotlightCard>
  );
}

function CompactCard({ rec, title }: { rec: ScoredVideo; title: string }) {
  const v = rec.video;
  const seed = (title + v.id).length;
  const gradient = `linear-gradient(135deg, hsl(${(seed * 37) % 360},45%,18%), hsl(${(seed * 67) % 360},55%,8%))`;
  return (
    <Link
      href={`/watch/${v.id}`}
      className="group flex gap-3 rounded-lg border border-white/5 bg-surface p-2 transition hover:border-accent/30 hover:bg-card-2"
    >
      <div
        className="relative h-16 w-28 shrink-0 rounded"
        style={{ background: gradient }}
      >
        <span className="absolute bottom-1 right-1 rounded bg-accent px-1.5 text-[8px] font-bold text-black">
          +{microToStx(v.rewardPerView)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 font-ui text-[12px] font-semibold text-white group-hover:text-accent">
          {title}
        </h4>
        <p className="mt-1 text-[10px] text-muted">
          Match {Math.round(rec.score * 100)}%
        </p>
      </div>
    </Link>
  );
}
