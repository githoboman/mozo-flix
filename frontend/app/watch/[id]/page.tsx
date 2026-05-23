"use client";

import { TopNav } from "@/components/TopNav";
import { SideNav } from "@/components/SideNav";
import { EngagementBar } from "@/components/EngagementBar";
import { SubscribeButton } from "@/components/SubscribeButton";
import { CommentsSection } from "@/components/CommentsSection";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getVideo,
  getPool,
  getCreatorProfile,
  hasClaimed,
  type VideoMeta,
  type PoolState,
  type CreatorProfile,
} from "@/lib/stacks-reads";
import { microToStx } from "@/lib/stacks";
import { ReadMore } from "@/components/ReadMore";
import { VideoPlayer } from "@/components/VideoPlayer";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { XEmbed } from "@/components/XEmbed";
import { ipfsToUrl } from "@/lib/ipfs";
import { useWallet } from "@/lib/useWallet";
import { recordWatch } from "@/lib/watchHistory";
import { RecommendedRail } from "@/components/RecommendedRail";
import { useToast } from "@/components/Toast";
import { TxChip } from "@/components/Chips";
import { formatStx } from "@/lib/format";
import { friendlyError } from "@/lib/errorMessage";
import { useVideoData } from "@/lib/useVideoData";

export default function WatchPage() {
  const params = useParams<{ id: string }>();
  const videoId = Number(params.id);
  const wallet = useWallet();
  const toast = useToast();

  const [video, setVideo] = useState<VideoMeta | null>(null);
  const [pool, setPool] = useState<PoolState | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const resolved = useVideoData(video);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewardStatus, setRewardStatus] = useState<
    | { kind: "idle" }
    | { kind: "claiming" }
    | { kind: "claimed"; txid: string }
    | { kind: "failed"; message: string }
  >({ kind: "idle" });
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const v = await getVideo(videoId);
        if (cancel) return;
        if (!v) {
          setError(`Video #${videoId} not found on-chain.`);
          setLoading(false);
          return;
        }
        setVideo(v);
        const [p, c, claimed] = await Promise.all([
          getPool(videoId),
          getCreatorProfile(v.creator),
          wallet.address
            ? hasClaimed(videoId, wallet.address)
            : Promise.resolve(false),
        ]);
        if (cancel) return;
        setPool(p);
        setCreator(c);
        setAlreadyClaimed(claimed);
        setLoading(false);
      } catch (e) {
        if (!cancel) {
          setError((e as Error).message ?? "Failed to load video");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [videoId, wallet.address]);

  const shortAddr = video
    ? `${video.creator.slice(0, 4)}…${video.creator.slice(-4)}`
    : "";
  const title = resolved.title;
  const desc =
    resolved.description ||
    creator?.bio ||
    "On-chain video published via mozoflix-videos contract.";
  const hasProfileName = Boolean(creator?.displayName);
  const creatorName = creator?.displayName ?? "Independent Creator";
  const poolBalance = pool?.balance ?? 0n;
  const totalFunded = pool?.totalFunded ?? 0n;
  const showFundedStat = totalFunded > 0n && totalFunded !== poolBalance;

  return (
    <>
      <TopNav />
      <div className="flex">
        <SideNav />
        <main className="relative flex-1 overflow-y-auto pt-[64px] md:pt-[60px] lg:ml-64">
          <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-[800px] w-[800px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(255,107,0,0.15)_0%,rgba(10,10,24,0)_70%)]" />
          <div className="relative z-10 mx-auto max-w-[1600px] p-4 sm:p-6 md:p-8 lg:p-grid_unit">
            {error ? (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-12 text-center">
                <div className="mb-2 font-display text-h2 text-red-300">
                  {error}
                </div>
                <a
                  href="/browse"
                  className="mt-4 inline-block font-ui text-[12px] uppercase tracking-[0.15em] text-accent hover:text-accent-bright"
                >
                  ← Back to Browse
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-4 md:gap-8">
                {/* Left: player + meta */}
                <div className="col-span-12 flex flex-col gap-8 xl:col-span-8">
                  {(() => {
                    const source = resolved.source;
                    const videoCid = resolved.videoCid;
                    const isLegacy = !source && !resolved.loading;

                    const triggerReward = async (pct: number) => {
                      if (!wallet.address) return;
                      if (!video?.active) return;
                      if (alreadyClaimed) return;
                      const guardKey = `mozoflix:claimed:${wallet.address}:${videoId}`;
                      if (
                        typeof window !== "undefined" &&
                        sessionStorage.getItem(guardKey)
                      )
                        return;
                      if (
                        rewardStatus.kind === "claiming" ||
                        rewardStatus.kind === "claimed"
                      )
                        return;
                      setRewardStatus({ kind: "claiming" });
                      try {
                        const res = await fetch("/api/distribute-reward", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            viewer: wallet.address,
                            videoId,
                            completion: pct,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error ?? "Failed");
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem(guardKey, data.txid);
                        }
                        setRewardStatus({ kind: "claimed", txid: data.txid });
                        toast.show({
                          kind: "success",
                          title: "Reward sent",
                          body: video
                            ? `+${formatStx(video.rewardPerView)} STX is on the way to your wallet`
                            : "Reward distributed",
                          action: {
                            label: "View tx",
                            href: `https://explorer.hiro.so/txid/0x${data.txid}?chain=testnet`,
                          },
                        });
                      } catch (e) {
                        const msg = friendlyError(e);
                        setRewardStatus({ kind: "failed", message: msg });
                        toast.show({
                          kind: "error",
                          title: "Reward unavailable",
                          body: msg,
                        });
                      }
                    };

                    const recordProgress = (cur: number, dur: number) => {
                      recordWatch({
                        videoId,
                        progress: cur,
                        duration: dur,
                        updatedAt: Date.now(),
                        completedAt:
                          cur >= dur * 0.95 ? Date.now() : undefined,
                      });
                    };

                    return (
                      <>
                        {video && !video.active && (
                          <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-300">
                            ⚠ This video has been deactivated by the creator.
                            New rewards are disabled.
                          </div>
                        )}
                        {alreadyClaimed && (
                          <div className="mb-3 rounded border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-200/80">
                            ✓ You&apos;ve already earned your reward on this
                            video. Each wallet can earn from a given video once.
                            Enjoy the rewatch.
                          </div>
                        )}
                        {isLegacy && (
                          <div className="mb-3 rounded border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200/80">
                            Legacy entry — registered before the manifest
                            pipeline existed. The creator can re-publish from{" "}
                            <a href="/upload" className="text-accent hover:underline">
                              /upload
                            </a>
                            .
                          </div>
                        )}

                        {/* Dispatch to the right player by source type */}
                        {source?.type === "youtube" ? (
                          <YouTubePlayer
                            videoId={source.youtubeId}
                            thresholdPct={video?.minCompletionPct ?? 70}
                            onProgress={recordProgress}
                            onReachedThreshold={triggerReward}
                          />
                        ) : source?.type === "x" ? (
                          <XEmbed
                            postId={source.postId}
                            thresholdSec={30}
                            onReachedThreshold={triggerReward}
                          />
                        ) : (
                          <VideoPlayer
                            src={videoCid ? ipfsToUrl(videoCid) : ""}
                            thresholdPct={video?.minCompletionPct ?? 70}
                            onProgress={recordProgress}
                            onReachedThreshold={triggerReward}
                          />
                        )}
                  {rewardStatus.kind === "claiming" && (
                    <div className="rounded border border-accent/30 bg-accent-dim p-3 text-[12px] text-accent">
                      Triggering on-chain reward distribution…
                    </div>
                  )}
                  {rewardStatus.kind === "claimed" && (
                    <div className="rounded border border-green-500/40 bg-green-500/10 p-3 text-[12px] text-green-300">
                      ✓ Reward sent. tx:{" "}
                      <a
                        href={`https://explorer.hiro.so/txid/${rewardStatus.txid}?chain=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-mono underline hover:text-green-200"
                      >
                        {rewardStatus.txid}
                      </a>
                    </div>
                  )}
                  {rewardStatus.kind === "failed" && (
                    <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-300">
                      Reward call failed: {rewardStatus.message}
                    </div>
                  )}
                      </>
                    );
                  })()}

                  {/* Meta + creator */}
                  <div className="flex flex-col items-start justify-between gap-6 md:flex-row">
                    <div className="flex-1">
                      <h1 className="mb-2 font-display text-h1">{title}</h1>
                      <ReadMore
                        text={desc}
                        limit={220}
                        className="max-w-2xl text-body-md text-muted"
                      />
                      {resolved.category && (
                        <span className="mt-3 inline-block rounded bg-card-2 px-2 py-1 font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
                          {resolved.category}
                        </span>
                      )}
                      <div className="mt-3 flex flex-wrap gap-3 font-ui text-[11px] uppercase tracking-[0.1em] text-muted">
                        <span className="rounded bg-accent-dim px-2 py-1 text-accent">
                          {video
                            ? `+${microToStx(video.rewardPerView)} STX/view`
                            : "—"}
                        </span>
                        <span>·</span>
                        <span>
                          {video ? `${video.minCompletionPct}% gate` : "—"}
                        </span>
                        <span>·</span>
                        <span>
                          {video
                            ? video.active
                              ? "Active"
                              : "Paused"
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Creator card — live on-chain stats */}
                    <div className="group relative w-full overflow-hidden rounded-xl border border-accent-border bg-card-2/80 p-6 backdrop-blur-md md:min-w-[300px] md:w-auto">
                      <div className="absolute bottom-0 left-0 h-[3px] w-0 bg-accent transition-all duration-500 group-hover:w-full" />
                      <div className="mb-6 flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full border-2 border-accent bg-gradient-to-br from-accent to-orange-700" />
                        <div>
                          <h3 className="font-ui text-ui-label-lg uppercase">
                            {creatorName}
                          </h3>
                          <p className="mt-1 font-mono text-[10px] text-muted">
                            {shortAddr}
                          </p>
                          <p className="mt-1 font-ui text-ui-label-sm uppercase text-accent">
                            {creator?.verified
                              ? "✓ Verified Creator"
                              : hasProfileName
                              ? "Creator"
                              : "On-chain publisher"}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <SubscribeButton />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-white/5 bg-surface p-3">
                          <div className="mb-1 font-ui text-[10px] uppercase text-muted">
                            Pool Balance
                          </div>
                          <div className="font-display text-3xl">
                            {pool ? microToStx(pool.balance) : "—"}
                            <span className="ml-1 text-[12px] text-muted">
                              STX
                            </span>
                          </div>
                        </div>
                        <div className="rounded-lg border border-white/5 bg-surface p-3">
                          <div className="mb-1 font-ui text-[10px] uppercase text-muted">
                            Rewards Paid
                          </div>
                          <div className="font-display text-3xl text-accent">
                            {pool ? microToStx(pool.totalDistributed) : "—"}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`mt-3 grid gap-4 text-[10px] uppercase tracking-[0.1em] text-muted ${
                          showFundedStat ? "grid-cols-2" : "grid-cols-1"
                        }`}
                      >
                        <div>
                          <span className="font-display text-base text-white">
                            {pool?.claimCount ?? 0}
                          </span>
                          <br />
                          Verified Views
                        </div>
                        {showFundedStat && (
                          <div>
                            <span className="font-display text-base text-white">
                              {microToStx(totalFunded)}
                            </span>
                            <br />
                            Total Funded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <EngagementBar
                    likes={pool?.claimCount ?? 0}
                    creator={hasProfileName ? creatorName : undefined}
                    creatorAddress={video?.creator}
                  />
                  <CommentsSection />
                </div>

                {/* Right: AI Up Next */}
                <div className="col-span-12 flex h-full flex-col xl:col-span-4">
                  <div className="flex flex-col rounded-xl border border-accent-border bg-card-2 p-5 xl:sticky xl:top-[100px] xl:max-h-[calc(100vh-200px)] xl:overflow-y-auto">
                    <RecommendedRail
                      excludeIds={[videoId]}
                      limit={5}
                      title="Up Next"
                      subtitle="AI picks based on your taste"
                      compact
                    />
                  </div>
                </div>
              </div>
            )}
            {loading && !error && (
              <div className="mt-8 text-center text-[12px] text-muted">
                Reading from contract…
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
