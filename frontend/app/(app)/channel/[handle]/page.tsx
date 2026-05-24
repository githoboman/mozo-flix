"use client";

import { VideoCard } from "@/components/VideoCard";
import { SubscribeButton } from "@/components/SubscribeButton";
import { MembershipModal } from "@/components/MembershipModal";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  listVideos,
  getCreatorProfile,
  getPool,
  type VideoMeta,
  type CreatorProfile,
} from "@/lib/stacks-reads";
import { microToStx } from "@/lib/stacks";
import { useWallet } from "@/lib/useWallet";
import { useResolvedVideoList } from "@/lib/useVideoList";

const TABS = ["Videos", "Live", "Playlists", "About"];

export default function ChannelPage() {
  const params = useParams<{ handle: string }>();
  const wallet = useWallet();
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const resolved = useResolvedVideoList(videos);
  const [stxDistributed, setStxDistributed] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);

  // Resolve "me" → connected wallet, otherwise treat handle as wallet address
  const targetAddress =
    params.handle === "me" ? wallet.address : params.handle;

  useEffect(() => {
    if (!targetAddress) {
      if (params.handle === "me" && !wallet.loading) setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const [p, all] = await Promise.all([
          getCreatorProfile(targetAddress),
          listVideos(),
        ]);
        if (cancel) return;
        const owned = all.filter(
          (v) => v.creator === targetAddress && v.active,
        );
        setProfile(p);
        setVideos(owned);
        // Sum total distributed across the creator's videos
        const pools = await Promise.all(owned.map((v) => getPool(v.id)));
        if (cancel) return;
        setStxDistributed(
          pools.reduce((sum, pool) => sum + pool.totalDistributed, 0n),
        );
        setLoading(false);
      } catch {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [targetAddress, wallet.loading, params.handle]);

  const shortAddr = targetAddress
    ? `${targetAddress.slice(0, 4)}…${targetAddress.slice(-4)}`
    : "";
  const displayName = profile?.displayName ?? shortAddr ?? "Unknown channel";

  // Edge case: /channel/me without wallet connected
  if (params.handle === "me" && !wallet.connected && !wallet.loading) {
    return (
      <>
        <main className="mx-auto max-w-[800px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[120px]">
          <div className="rounded-2xl border border-accent-border bg-card p-12 text-center">
            <h1 className="mb-3 font-display text-h1">Connect your wallet</h1>
            <p className="text-muted">
              You need to connect a wallet to view your channel.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <main>
        <div className="relative h-[180px] w-full overflow-hidden bg-gradient-to-br from-card via-surface to-bg pt-[60px] md:h-[260px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,107,0,0.15),transparent_60%)]" />
        </div>

        <div className="mx-auto max-w-[1400px] px-4 pb-24 sm:px-6 md:px-12">
          <div className="-mt-12 mb-10 flex flex-col gap-6 rounded-2xl border border-accent-border bg-card p-6 md:-mt-20 md:p-8 md:flex-row md:items-center">
            <div className="h-20 w-20 shrink-0 rounded-full border-4 border-bg bg-gradient-to-br from-accent to-orange-700 md:h-32 md:w-32" />
            <div className="flex-1">
              <h1 className="font-display text-[clamp(40px,5vw,72px)] uppercase leading-none">
                {displayName}
                {profile?.verified && (
                  <span className="ml-3 align-middle text-2xl text-accent">
                    ✓
                  </span>
                )}
              </h1>
              {targetAddress && (
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {targetAddress}
                </p>
              )}
              <p className="mt-2 max-w-xl text-[14px] font-light text-muted">
                {profile?.bio ??
                  (profile === null && !loading
                    ? "This creator hasn't registered an on-chain profile yet."
                    : "Loading creator profile…")}
              </p>
              <div className="mt-4 flex flex-wrap gap-6 font-ui text-[11px] uppercase tracking-[0.1em]">
                <span className="text-muted">
                  <span className="font-display text-2xl text-white">
                    {videos.length}
                  </span>
                  <br />
                  Videos
                </span>
                <span className="text-muted">
                  <span className="font-display text-2xl text-accent">
                    {microToStx(stxDistributed)}
                  </span>
                  <br />
                  STX Distributed
                </span>
                <span className="text-muted">
                  <span className="font-display text-2xl text-white">
                    {profile?.reputation ?? 0}
                  </span>
                  <br />
                  Reputation
                </span>
                <span className="text-muted">
                  <span className="font-display text-2xl text-white">
                    {profile?.joinedAt ? `#${profile.joinedAt}` : "—"}
                  </span>
                  <br />
                  Joined Block
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <SubscribeButton />
              <button
                onClick={() => setMembershipOpen(true)}
                className="rounded border border-white/10 px-5 py-2.5 font-ui text-[11px] uppercase tracking-[0.1em] text-muted transition hover:border-accent hover:text-accent"
              >
                Join Membership
              </button>
            </div>
          </div>

          <div className="mb-10 flex gap-2 border-b border-white/5 pb-1">
            {TABS.map((t, i) => (
              <button
                key={t}
                className={`-mb-px border-b-2 px-4 py-3 font-ui text-[11px] font-bold uppercase tracking-[0.1em] transition ${
                  i === 0
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-muted">Loading videos…</div>
          ) : videos.length === 0 ? (
            <div className="rounded-2xl border border-accent-border bg-card p-12 text-center text-muted">
              No videos uploaded yet.
            </div>
          ) : (
            <div className="stagger-children grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {(resolved ?? []).map(({ video: v, title, category, thumbnail }) => (
                <VideoCard
                  key={v.id}
                  id={String(v.id)}
                  title={title}
                  creator={profile?.displayName}
                  category={category}
                  views={`${v.minCompletionPct}% gate`}
                  reward={`+${microToStx(v.rewardPerView)} STX`}
                  duration="—"
                  thumb={thumbnail ?? undefined}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <MembershipModal
        open={membershipOpen}
        onClose={() => setMembershipOpen(false)}
        creator={displayName}
      />
    </>
  );
}
