"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { recommend, type ScoredVideo } from "@/lib/recommendations";
import { microToStx } from "@/lib/stacks";
import { watchUrl } from "@/lib/format";
import {
  useResolvedVideoList,
  type ResolvedListItem,
} from "@/lib/useVideoList";
import { useData } from "@/lib/DataProvider";

export function RecommendedRail({
  excludeIds = [],
  limit = 8,
  title = "For You",
  subtitle = "AI-curated from your watch history",
  compact = false,
  resolvedPool,
}: {
  excludeIds?: number[];
  limit?: number;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  /**
   * Pre-resolved video pool. When provided, the rail skips its own
   * listVideos + manifest fetches entirely and scores from this list.
   * Pass this from a parent that already has the data (e.g. /browse).
   */
  resolvedPool?: ResolvedListItem[] | null;
}) {
  const { getVideos } = useData();
  const [fallbackPool, setFallbackPool] = useState<ResolvedListItem[] | null>(
    null,
  );

  // Fallback: when parent didn't pass a resolved pool, fetch our own.
  // Uses the DataProvider cache so the call is free if browse already
  // populated it.
  useEffect(() => {
    if (resolvedPool !== undefined) return;
    let cancel = false;
    getVideos()
      .then((all) => {
        if (cancel) return;
        // We don't have titles here — synthesize ResolvedListItem stubs and
        // let the manifest hook below fill them in.
        setFallbackPool(
          all
            .filter((v) => v.active)
            .map((v) => ({
              video: v,
              title: `Video #${v.id}`,
              description: "",
              videoCid: null,
              source: null,
              thumbnail: null,
              manifestResolved: false,
            })),
        );
      })
      .catch(() => {
        if (!cancel) setFallbackPool([]);
      });
    return () => {
      cancel = true;
    };
  }, [resolvedPool, getVideos]);

  // Score whichever pool we have. Stable identity per render so the
  // manifest resolver below doesn't thrash.
  const recs = useMemo<ScoredVideo[] | null>(() => {
    const pool = resolvedPool ?? fallbackPool;
    if (!pool) return null;
    const videos = pool.map((p) => p.video);
    return recommend(videos, new Set(excludeIds), limit * 2);
  }, [resolvedPool, fallbackPool, excludeIds, limit]);

  // Fill in manifest data only for the standalone path. When the parent
  // already resolved the pool, reuse those resolutions directly.
  const fetchedResolved = useResolvedVideoList(
    !resolvedPool && recs ? recs.map((r) => r.video) : null,
  );
  const resolved = resolvedPool ?? fetchedResolved;

  // Build display list, showing whatever's resolved as it comes in.
  // No more all-or-nothing gate.
  const display = useMemo(() => {
    if (!recs || !resolved) return null;
    const byId = new Map(resolved.map((r) => [r.video.id, r]));
    const out: Array<{ rec: ScoredVideo; title: string }> = [];
    for (const r of recs) {
      const item = byId.get(r.video.id);
      if (!item || !item.manifestResolved) continue;
      out.push({ rec: r, title: item.title });
      if (out.length >= limit) break;
    }
    return out;
  }, [recs, resolved, limit]);

  // Only show skeleton during the *initial* load — once we have any data
  // (even partial), render results immediately so the page doesn't feel
  // blocked on the slowest IPFS gateway.
  const hasAnyData = !!resolved;
  const showSkeleton = !hasAnyData && !display;

  if (showSkeleton) {
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

  if (!display || display.length === 0) return null;

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
    <Link
      href={watchUrl(v.id, title)}
      className="group block w-[260px] shrink-0 snap-start overflow-hidden rounded-xl border border-accent-border bg-card-2 transition-colors hover:border-accent/40"
    >
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
  );
}

function CompactCard({ rec, title }: { rec: ScoredVideo; title: string }) {
  const v = rec.video;
  const seed = (title + v.id).length;
  const gradient = `linear-gradient(135deg, hsl(${(seed * 37) % 360},45%,18%), hsl(${(seed * 67) % 360},55%,8%))`;
  return (
    <Link
      href={watchUrl(v.id, title)}
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
