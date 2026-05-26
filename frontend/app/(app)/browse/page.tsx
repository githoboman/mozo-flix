"use client";

import { SideNav } from "@/components/SideNav";
import { VideoCard } from "@/components/VideoCard";
import { SkeletonGrid } from "@/components/Skeleton";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type VideoMeta } from "@/lib/stacks-reads";
import { microToStx } from "@/lib/stacks";
import { useResolvedVideoList } from "@/lib/useVideoList";
import { useData } from "@/lib/DataProvider";
import { useWallet } from "@/lib/useWallet";
import { getVideoMeta } from "@/lib/videoMeta";

type Sort = "newest" | "reward" | "oldest";

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowseInner />
    </Suspense>
  );
}

function BrowseInner() {
  const { getVideos } = useData();
  const wallet = useWallet();
  const router = useRouter();
  const params = useSearchParams();

  const cat = params.get("cat") ?? "";
  const owner = params.get("owner") ?? "";
  const sort = (params.get("sort") as Sort) ?? "newest";

  const [allVideos, setAllVideos] = useState<VideoMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    getVideos()
      .then((list) => {
        if (!cancel) setAllVideos(list.filter((v) => v.active));
      })
      .catch((e) => {
        if (!cancel)
          setError((e as Error).message ?? "Failed to load videos");
      });
    return () => {
      cancel = true;
    };
  }, [getVideos]);

  // Apply category + owner filters
  const filtered = useMemo(() => {
    if (!allVideos) return null;
    let list = [...allVideos];
    if (cat) {
      list = list.filter((v) => getVideoMeta(v.id)?.category === cat);
    }
    if (owner === "me" && wallet.address) {
      list = list.filter((v) => v.creator === wallet.address);
    }
    // Sort
    if (sort === "reward") {
      list.sort((a, b) =>
        Number(b.rewardPerView) - Number(a.rewardPerView),
      );
    } else if (sort === "oldest") {
      list.sort((a, b) => a.createdAt - b.createdAt);
    } else {
      // newest (default)
      list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [allVideos, cat, owner, sort, wallet.address]);

  const resolved = useResolvedVideoList(filtered);
  const hasFilter = !!(cat || owner);

  const setSort = (next: Sort) => {
    const p = new URLSearchParams(params);
    p.set("sort", next);
    router.push(`/browse?${p.toString()}`);
  };

  return (
    <>
      <div className="flex">
        <SideNav />
        <main className="flex-1 p-4 pt-[80px] sm:p-6 md:p-10 md:pt-[100px] lg:ml-64 lg:p-grid_unit lg:pt-[120px]">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="mb-1.5 font-display text-h2 uppercase tracking-wide">
                {hasFilter
                  ? cat
                    ? `${cat} videos`
                    : owner === "me"
                    ? "Your channel"
                    : "Filtered"
                  : "What you'll watch today"}
              </h1>
              <p className="text-[13px] text-muted">
                Every video you finish pays you in STX. No subscriptions, no
                ads — just creators tipping back the people who showed up.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SortChip
                icon="schedule"
                label="Newest"
                active={sort === "newest"}
                onClick={() => setSort("newest")}
              />
              <SortChip
                icon="paid"
                label="Reward Size"
                active={sort === "reward"}
                onClick={() => setSort("reward")}
              />
              <SortChip
                icon="history"
                label="Oldest"
                active={sort === "oldest"}
                onClick={() => setSort("oldest")}
              />
            </div>
          </div>

          {error ? (
            <ErrorCard message={error} />
          ) : filtered === null ? (
            <SkeletonGrid count={6} />
          ) : filtered.length === 0 ? (
            hasFilter ? <NoMatch /> : <EmptyState />
          ) : (
            <>
              <h2 className="mb-3 mt-6 font-display text-xl uppercase tracking-wide">
                {hasFilter
                  ? `${filtered.length} video${filtered.length === 1 ? "" : "s"}`
                  : "All Videos"}
              </h2>
              <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4">
                {(resolved ?? []).map(({ video: v, title, thumbnail, category }) => (
                  <VideoCard
                    key={v.id}
                    id={String(v.id)}
                    title={title}
                    category={category}
                    views={`${v.minCompletionPct}% gate · earn`}
                    reward={`+${microToStx(v.rewardPerView)}`}
                    duration="—"
                    thumb={thumbnail ?? undefined}
                  />
                ))}
              </div>
            </>
          )}

          <div className="mb-12 mt-grid_unit flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-card-2/50 px-6 py-3 backdrop-blur-sm">
              <span className="material-symbols-outlined text-[18px] text-accent">
                link
              </span>
              <span className="font-ui text-[12px] tracking-wider text-muted">
                LIVE FROM
                <span className="mx-2 text-white/20">•</span>
                <span className="font-mono">mozoflix-videos</span>
                <span className="mx-2 text-white/20">•</span>
                TESTNET
              </span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function SortChip({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`press-feedback flex items-center gap-2 rounded-full border px-4 py-2 font-ui text-[12px] uppercase tracking-[0.1em] transition ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-white/10 bg-card text-muted hover:border-white/30 hover:text-white"
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-accent-border bg-card p-16 text-center">
      <div className="mb-4 text-5xl">📭</div>
      <h2 className="mb-2 font-display text-h2">Quiet in here</h2>
      <p className="mx-auto max-w-md text-[14px] font-light text-muted">
        Nobody&apos;s published a video yet — which means the entire feed
        is yours for the taking. Upload one, fund the pool, and you&apos;re
        the first.
      </p>
      <a
        href="/upload"
        className="press-feedback mt-6 inline-block rounded bg-accent px-6 py-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-black hover:bg-accent-bright"
      >
        Be the first creator →
      </a>
    </div>
  );
}

function NoMatch() {
  return (
    <div className="rounded-2xl border border-accent-border bg-card p-16 text-center">
      <div className="mb-4 text-5xl">🔍</div>
      <h2 className="mb-2 font-display text-h2">Nothing matches that filter</h2>
      <p className="mx-auto max-w-md text-[14px] font-light text-muted">
        Try a different category or clear filters to see everything.
      </p>
      <a
        href="/browse"
        className="press-feedback mt-6 inline-block rounded border border-white/15 px-6 py-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-white hover:border-accent hover:text-accent"
      >
        ✕ Clear filters
      </a>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center">
      <div className="mb-2 font-display text-h2 text-red-300">
        Couldn&apos;t reach the contract
      </div>
      <p className="text-[13px] font-light text-red-200/80">{message}</p>
      <p className="mt-3 font-mono text-[11px] text-red-200/60">
        Check that NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local matches your
        deployer.
      </p>
    </div>
  );
}
