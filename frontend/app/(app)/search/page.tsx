"use client";

import { TopNav } from "@/components/TopNav";
import { VideoCard } from "@/components/VideoCard";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { listVideos, type VideoMeta } from "@/lib/stacks-reads";
import { microToStx } from "@/lib/stacks";
import { useResolvedVideoList } from "@/lib/useVideoList";

const FILTERS = ["All", "Videos", "Channels"];

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchInner />
    </Suspense>
  );
}

function SearchFallback() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[100px]">
        <div className="text-muted">Loading search…</div>
      </main>
    </>
  );
}

function SearchInner() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";

  const [allVideos, setAllVideos] = useState<VideoMeta[] | null>(null);

  useEffect(() => {
    listVideos().then((list) => setAllVideos(list.filter((v) => v.active)));
  }, []);

  // Resolve manifests for ALL videos, then filter by query
  const resolved = useResolvedVideoList(allVideos);
  const filtered = (resolved ?? []).filter((r) => {
    if (!query) return true;
    const haystack = [
      r.title,
      r.description ?? "",
      r.category ?? "",
      r.video.creator,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  // Channels: unique creators across all videos
  const channels = Array.from(
    new Set((allVideos ?? []).map((v) => v.creator)),
  ).filter((addr) => {
    if (!query) return true;
    return addr.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[100px]">
        <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
          Search results for
        </div>
        <h1 className="mb-8 font-display text-h1 uppercase">
          <span className="text-accent">&quot;{query || "everything"}&quot;</span>
        </h1>

        <div className="mb-8 flex flex-wrap gap-2">
          {FILTERS.map((f, i) => (
            <button
              key={f}
              className={`rounded-full border px-4 py-2 font-ui text-[11px] uppercase tracking-[0.1em] transition ${
                i === 0
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 bg-card-2 text-muted hover:border-white/30 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {allVideos === null ? (
          <div className="rounded-2xl border border-accent-border bg-card p-12 text-center text-muted">
            Loading from chain…
          </div>
        ) : filtered.length === 0 && channels.length === 0 ? (
          <div className="rounded-2xl border border-accent-border bg-card p-12 text-center">
            <div className="mb-3 text-4xl">🔍</div>
            <h2 className="mb-2 font-display text-h2">No matches</h2>
            <p className="text-[14px] font-light text-muted">
              Try a different query, or browse all videos on{" "}
              <a href="/browse" className="text-accent hover:underline">
                /browse
              </a>
              .
            </p>
          </div>
        ) : (
          <>
            {channels.length > 0 && (
              <div className="mb-12">
                <h2 className="mb-4 font-display text-h2">
                  Channels ({channels.length})
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {channels.slice(0, 6).map((addr) => (
                    <a
                      key={addr}
                      href={`/channel/${addr}`}
                      className="card-reveal flex items-center gap-4 rounded-xl border border-accent-border bg-card p-5 transition hover:border-accent/30"
                    >
                      <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-accent to-orange-700" />
                      <div className="flex-1">
                        <div className="font-ui text-[14px] font-bold">
                          {addr.slice(0, 6)}…{addr.slice(-4)}
                        </div>
                        <div className="font-mono text-[10px] text-muted">
                          {addr}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {filtered.length > 0 && (
              <div>
                <h2 className="mb-4 font-display text-h2">
                  Videos ({filtered.length})
                </h2>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((r) => (
                    <VideoCard
                      key={r.video.id}
                      id={String(r.video.id)}
                      title={r.title}
                      category={r.category}
                      views={`${r.video.minCompletionPct}% gate`}
                      reward={`+${microToStx(r.video.rewardPerView)} STX`}
                      duration="—"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
