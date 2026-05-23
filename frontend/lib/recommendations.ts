/**
 * lib/recommendations.ts
 * Pure-client heuristic scorer for "For You" rails. No external API.
 *
 * Inputs:
 *   - all active on-chain videos
 *   - viewer's local watch history + liked + watch-later
 *   - per-viewer claim history (from contract)
 *
 * Output: ranked list with score breakdowns (so we can debug + tune weights).
 */

import type { VideoMeta } from "./stacks-reads";
import { getAllWatchHistory, getLikedVideos, getWatchLater } from "./watchHistory";
import { getVideoMeta } from "./videoMeta";

export type ScoredVideo = {
  video: VideoMeta;
  score: number;
  reasons: string[];
};

type ViewerSignal = {
  watchedIds: Set<number>;
  likedIds: Set<number>;
  watchLaterIds: Set<number>;
  /** creator address → number of their videos the viewer engaged with */
  creatorAffinity: Map<string, number>;
  /** category → engagement count */
  categoryAffinity: Map<string, number>;
  /** preferred reward range based on what they've watched */
  avgRewardWatched: bigint;
};

function buildSignal(allVideos: VideoMeta[]): ViewerSignal {
  const history = getAllWatchHistory();
  const liked = getLikedVideos();
  const wl = getWatchLater();

  const watchedIds = new Set(history.map((h) => h.videoId));
  const likedIds = new Set(liked);
  const watchLaterIds = new Set(wl);

  const creatorAffinity = new Map<string, number>();
  const categoryAffinity = new Map<string, number>();
  let rewardSum = 0n;
  let rewardN = 0;

  // Engaged = watched, liked, or saved
  const engagedIds = new Set<number>([...watchedIds, ...likedIds, ...watchLaterIds]);
  const byId = new Map(allVideos.map((v) => [v.id, v]));

  for (const id of engagedIds) {
    const v = byId.get(id);
    if (!v) continue;
    creatorAffinity.set(v.creator, (creatorAffinity.get(v.creator) ?? 0) + 1);
    const meta = getVideoMeta(id);
    if (meta?.category) {
      categoryAffinity.set(
        meta.category,
        (categoryAffinity.get(meta.category) ?? 0) + 1,
      );
    }
    rewardSum += v.rewardPerView;
    rewardN += 1;
  }

  return {
    watchedIds,
    likedIds,
    watchLaterIds,
    creatorAffinity,
    categoryAffinity,
    avgRewardWatched: rewardN > 0 ? rewardSum / BigInt(rewardN) : 0n,
  };
}

/**
 * Score a single candidate against the viewer's signal.
 * Returns 0 if filtered out, otherwise a 0..1 score.
 */
function scoreVideo(v: VideoMeta, sig: ViewerSignal): ScoredVideo | null {
  // Hard filters
  if (!v.active) return null;
  // Optional: hide already-claimed by viewer — but we can't know without
  // a contract read; surface them anyway, the UI will mark them watched.

  const reasons: string[] = [];
  let score = 0;

  // (a) Creator affinity — 0..1
  const affinity = sig.creatorAffinity.get(v.creator) ?? 0;
  if (affinity > 0) {
    const w = Math.min(1, affinity / 3); // saturates after 3 engagements
    score += 0.35 * w;
    reasons.push(`you've engaged with this creator ${affinity}×`);
  }

  // (b) Category match
  const meta = getVideoMeta(v.id);
  if (meta?.category) {
    const cat = sig.categoryAffinity.get(meta.category) ?? 0;
    if (cat > 0) {
      const w = Math.min(1, cat / 5);
      score += 0.2 * w;
      reasons.push(`matches ${meta.category}, which you watch`);
    }
  }

  // (c) Reward attraction — videos near or above viewer's average reward
  if (sig.avgRewardWatched > 0n) {
    const ratio = Number(v.rewardPerView) / Number(sig.avgRewardWatched);
    // Peak interest when ratio ≈ 1.2× viewer's normal
    const w = Math.max(0, 1 - Math.abs(ratio - 1.2));
    score += 0.15 * w;
  } else if (v.rewardPerView > 0n) {
    score += 0.1; // generic baseline for new viewers
  }

  // (d) Recency — videos within last 1000 blocks (~1 week)
  const blocksSinceMint = 1_000_000 - v.createdAt; // we don't know current, use heuristic
  const recencyW =
    v.createdAt > 0 ? Math.min(1, Math.max(0, 1 - blocksSinceMint / 100_000)) : 0.5;
  score += 0.1 * recencyW;

  // (e) Already-watched penalty — softer than filter so they can re-discover
  if (sig.watchedIds.has(v.id)) {
    score *= 0.4;
    reasons.push("already watched — replay");
  }

  // (f) Liked/saved boost
  if (sig.likedIds.has(v.id)) {
    score += 0.05;
    reasons.push("you liked this");
  }
  if (sig.watchLaterIds.has(v.id)) {
    score += 0.05;
    reasons.push("saved for later");
  }

  // (g) Cold-start: when viewer has no signal at all, fall back to a
  // popularity proxy = reward rate * 1e-7 so high-reward videos surface.
  if (sig.watchedIds.size === 0 && sig.likedIds.size === 0) {
    score = 0.1 + Number(v.rewardPerView) / 1e8; // 0.1 baseline + reward tilt
    reasons.push("popular");
  }

  return { video: v, score, reasons };
}

export function recommend(
  allVideos: VideoMeta[],
  excludeIds: Set<number> = new Set(),
  limit = 8,
): ScoredVideo[] {
  const sig = buildSignal(allVideos);
  const scored: ScoredVideo[] = [];
  for (const v of allVideos) {
    if (excludeIds.has(v.id)) continue;
    const s = scoreVideo(v, sig);
    if (s && s.score > 0) scored.push(s);
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
