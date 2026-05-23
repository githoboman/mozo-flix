"use client";

import { TopNav } from "@/components/TopNav";
import { VideoCard } from "@/components/VideoCard";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useEffect, useState } from "react";
import {
  getAllWatchHistory,
  getContinueWatching,
  getLikedVideos,
  getWatchLater,
  type WatchEntry,
} from "@/lib/watchHistory";
import { getVideo, type VideoMeta } from "@/lib/stacks-reads";
import { microToStx } from "@/lib/stacks";
import { getVideoMeta } from "@/lib/videoMeta";

const TABS = ["Continue Watching", "History", "Watch Later", "Playlists", "Liked"] as const;
type Tab = (typeof TABS)[number];

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("Continue Watching");
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlists, setPlaylists] = useState<string[]>([]);
  const [history, setHistory] = useState<WatchEntry[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchEntry[]>([]);
  const [watchLater, setWatchLater] = useState<number[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [videos, setVideos] = useState<Record<number, VideoMeta>>({});

  // Refresh local state on mount
  useEffect(() => {
    setHistory(getAllWatchHistory());
    setContinueWatching(getContinueWatching());
    setWatchLater(getWatchLater());
    setLiked(getLikedVideos());
    try {
      setPlaylists(JSON.parse(localStorage.getItem("mozoflix:playlists") ?? "[]"));
    } catch {}
  }, []);

  // Fetch on-chain video metadata for every referenced ID
  useEffect(() => {
    const ids = new Set<number>([
      ...history.map((e) => e.videoId),
      ...watchLater,
      ...liked,
    ]);
    Promise.all(
      Array.from(ids).map(async (id) => [id, await getVideo(id)] as const),
    ).then((pairs) => {
      const next: Record<number, VideoMeta> = {};
      for (const [id, v] of pairs) if (v) next[id] = v;
      setVideos(next);
    });
  }, [history, watchLater, liked]);

  const renderList = (ids: number[]) => {
    if (ids.length === 0) {
      return (
        <EmptyState tab={tab} />
      );
    }
    return (
      <div className="stagger-children grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {ids.map((id) => {
          const v = videos[id];
          if (!v) return null;
          const meta = getVideoMeta(id);
          return (
            <VideoCard
              key={id}
              id={String(id)}
              title={meta?.title ?? `Video #${id}`}
              category={meta?.category}
              views={`Block ${v.createdAt}`}
              reward={`+${microToStx(v.rewardPerView)} STX`}
              duration="—"
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[100px]">
        <div className="mb-2 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          Library
        </div>
        <h1 className="mb-10 font-display text-[clamp(48px,5vw,80px)] uppercase leading-[0.95]">
          Picking up where <span className="text-accent">you left off</span>
        </h1>

        <div className="mb-10 flex flex-wrap gap-2 border-b border-white/5 pb-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative -mb-px border-b-2 px-4 py-3 font-ui text-[11px] font-bold uppercase tracking-[0.1em] transition ${
                tab === t
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Continue Watching" &&
          renderList(continueWatching.map((e) => e.videoId))}
        {tab === "History" && renderList(history.map((e) => e.videoId))}
        {tab === "Watch Later" && renderList(watchLater)}
        {tab === "Liked" && renderList(liked)}
        {tab === "Playlists" && (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {playlists.map((p) => (
                <div
                  key={p}
                  className="card-reveal cursor-pointer rounded-xl border border-accent-border bg-card p-6 transition hover:border-accent/30"
                >
                  <div className="mb-3 aspect-video rounded-lg bg-gradient-to-br from-card-2 to-surface" />
                  <div className="font-ui text-[15px] font-bold">{p}</div>
                  <div className="mt-1 text-[11px] text-muted">
                    Empty playlist — add videos from the watch page
                  </div>
                </div>
              ))}
              <button
                onClick={() => setNewPlaylistOpen(true)}
                className="flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-white/10 font-ui text-[12px] uppercase tracking-[0.1em] text-muted transition hover:border-accent hover:text-accent"
              >
                + New Playlist
              </button>
            </div>
            <ConfirmModal
              open={newPlaylistOpen}
              onClose={() => {
                setNewPlaylistOpen(false);
                setPlaylistName("");
              }}
              title="NEW PLAYLIST"
              confirmLabel="Create"
              onConfirm={() => {
                if (playlistName.trim()) {
                  const next = [playlistName.trim(), ...playlists];
                  setPlaylists(next);
                  localStorage.setItem(
                    "mozoflix:playlists",
                    JSON.stringify(next),
                  );
                  setPlaylistName("");
                }
              }}
              body={
                <input
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder="Playlist name..."
                  autoFocus
                  className="w-full rounded border border-white/10 bg-surface px-4 py-3 text-[14px] text-white placeholder-muted focus:border-accent focus:outline-none"
                />
              }
            />
          </>
        )}
      </main>
    </>
  );
}

function EmptyState({ tab }: { tab: string }) {
  const blurb: Record<string, string> = {
    "Continue Watching":
      "Press play on any video and we'll remember where you left off. Resume from any device once you're signed in.",
    History:
      "Every video you watch shows up here, with the exact second you stopped. Nothing leaves your browser unless Firebase is connected.",
    "Watch Later":
      "See something you'll get to later? Tap the bookmark — it'll wait right here.",
    Liked:
      "Hit 👍 on the videos you loved. Your liked list helps the AI recommender learn your taste.",
  };
  return (
    <div className="rounded-2xl border border-accent-border bg-card p-16 text-center">
      <div className="mb-3 text-4xl">📚</div>
      <h2 className="mb-2 font-display text-h2">Nothing here yet</h2>
      <p className="mx-auto max-w-md text-[14px] font-light text-muted">
        {blurb[tab]}
      </p>
      <a
        href="/browse"
        className="mt-6 inline-block rounded bg-accent px-6 py-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-black hover:bg-accent-bright"
      >
        Browse Videos →
      </a>
    </div>
  );
}
