/**
 * lib/rewardOptimizer.ts
 * Heuristic AI for creator reward pricing + pool top-ups.
 *
 * Inputs available client-side:
 *   - All on-chain videos (for network avg reward rate)
 *   - Per-video pool state (balance, totalFunded, totalDistributed, claimCount)
 *   - Optional manifest category / target audience
 *
 * Outputs:
 *   - Suggested reward-per-view for new uploads
 *   - Suggested top-up amount based on burn rate
 *   - Suggested rate adjustment (raise / lower) for active campaigns
 */

import type { VideoMeta, PoolState } from "./stacks-reads";
import { stxToMicro, microToStx } from "./stacks";

export type RewardSuggestion = {
  rewardPerViewStx: number;  // recommended rate in STX
  poolStx: number;            // recommended initial pool in STX
  fundsViews: number;         // how many verified views the pool would buy
  rationale: string[];        // bullet points for the UI
  confidence: "low" | "medium" | "high";
};

export type TopUpSuggestion = {
  topUpStx: number;            // recommended top-up amount
  daysRunway: number;          // current runway in days at current burn
  newRunwayDays: number;       // runway after top-up
  velocity: number;            // claims per day (last 7d estimate)
  rationale: string[];
  urgent: boolean;             // pool < 3 days runway
};

export type RateAdjustment = {
  currentStx: number;
  suggestedStx: number;
  delta: number;
  direction: "raise" | "lower" | "hold";
  rationale: string[];
};

// ============================================================================
// New upload suggestion
// ============================================================================

export function suggestRewardForUpload(
  allVideos: VideoMeta[],
  targetCategory?: string,
): RewardSuggestion {
  const active = allVideos.filter((v) => v.active);

  // Network baseline = median of active reward rates
  const rates = active.map((v) => Number(v.rewardPerView));
  rates.sort((a, b) => a - b);
  const median =
    rates.length > 0
      ? rates[Math.floor(rates.length / 2)] ?? 1_000_000
      : 1_000_000;
  const networkMedianStx = median / 1_000_000;

  const rationale: string[] = [];
  let rewardStx = networkMedianStx;
  let confidence: RewardSuggestion["confidence"] = "low";

  if (active.length === 0) {
    rewardStx = 1; // 1 STX default for empty network
    rationale.push("Network has no active videos yet — starting at 1 STX/view");
  } else {
    rationale.push(
      `Network median: ${networkMedianStx.toFixed(2)} STX/view across ${active.length} active video${active.length === 1 ? "" : "s"}`,
    );
    confidence = active.length >= 5 ? "high" : "medium";
  }

  // If targeting a specific category and we have data, bias slightly
  // (currently no per-category data on-chain, so this is a placeholder for v2)
  if (targetCategory) {
    rationale.push(`Aiming at "${targetCategory}" viewers — no segment data yet, using network median`);
  }

  // Pool sizing: enough for ~50 verified views with a 20% safety buffer
  const targetViews = 50;
  const poolStx = +(rewardStx * targetViews * 1.2).toFixed(2);
  const fundsViews = Math.floor(poolStx / rewardStx);

  rationale.push(
    `Recommended pool: ${poolStx} STX → funds ~${fundsViews} verified views`,
  );
  rationale.push("After 5% platform fee, 95% of your deposit lands in the pool");

  return {
    rewardPerViewStx: +rewardStx.toFixed(2),
    poolStx,
    fundsViews,
    rationale,
    confidence,
  };
}

// ============================================================================
// Top-up suggestion (existing pool running low)
// ============================================================================

export function suggestTopUp(
  pool: PoolState,
  rewardPerViewMicro: bigint,
  ageBlocks: number, // blocks since video was registered
): TopUpSuggestion {
  const balance = Number(pool.balance);
  const reward = Number(rewardPerViewMicro);
  const claims = pool.claimCount;

  // Block time ≈ 10 min on testnet, 10 min on mainnet. Convert to days.
  const ageDays = Math.max(1, ageBlocks / 144);
  const velocity = claims / ageDays;
  const daysRunway = reward > 0 && velocity > 0
    ? balance / (reward * velocity)
    : balance > 0 ? 30 : 0;

  const targetDays = 30;
  const targetBalance = reward * velocity * targetDays;
  const topUpMicro = Math.max(0, targetBalance - balance);
  const topUpStx = +(topUpMicro / 1_000_000).toFixed(2);
  const newRunwayDays = reward > 0 && velocity > 0
    ? (balance + topUpMicro) / (reward * velocity)
    : targetDays;

  const rationale: string[] = [];
  if (velocity === 0 && claims === 0) {
    rationale.push("No claims yet — burn rate unknown");
    rationale.push(`Current balance ${microToStx(pool.balance)} STX should comfortably cover early views`);
    return {
      topUpStx: 0,
      daysRunway: 30,
      newRunwayDays: 30,
      velocity: 0,
      rationale,
      urgent: false,
    };
  }

  rationale.push(`Current velocity: ${velocity.toFixed(1)} claims/day (over ${ageDays.toFixed(1)} days)`);
  rationale.push(`Current runway: ${daysRunway.toFixed(1)} days at this pace`);
  if (topUpStx > 0) {
    rationale.push(
      `Top up ${topUpStx} STX → extends runway to ${newRunwayDays.toFixed(0)} days`,
    );
  } else {
    rationale.push("You're funded for 30+ days. No action needed.");
  }

  return {
    topUpStx,
    daysRunway,
    newRunwayDays,
    velocity,
    rationale,
    urgent: daysRunway < 3,
  };
}

// ============================================================================
// Rate adjustment for active campaign
// ============================================================================

export function suggestRateAdjustment(
  pool: PoolState,
  rewardPerViewMicro: bigint,
  ageBlocks: number,
  networkMedianMicro: bigint,
): RateAdjustment {
  const reward = Number(rewardPerViewMicro);
  const median = Number(networkMedianMicro);
  const ageDays = Math.max(1, ageBlocks / 144);
  const velocity = pool.claimCount / ageDays;

  const rationale: string[] = [];
  const currentStx = reward / 1_000_000;
  let suggestedStx = currentStx;
  let direction: RateAdjustment["direction"] = "hold";

  // If velocity is low (< 0.5 claims/day) and you're below median, raise
  // If velocity is high (> 5/day) you can lower without losing views
  // Otherwise, hold
  if (velocity < 0.5 && reward < median) {
    suggestedStx = +(median / 1_000_000).toFixed(2);
    direction = "raise";
    rationale.push(
      `Low traction (${velocity.toFixed(1)}/day). Match network median ${(median / 1_000_000).toFixed(2)} STX to attract more viewers.`,
    );
  } else if (velocity > 5 && reward > median * 0.8) {
    suggestedStx = +((reward * 0.85) / 1_000_000).toFixed(2);
    direction = "lower";
    rationale.push(
      `Strong demand (${velocity.toFixed(1)} claims/day). You can lower rate by 15% and still keep viewers.`,
    );
  } else {
    rationale.push(`Pricing looks healthy at ${currentStx.toFixed(2)} STX. No change suggested.`);
  }

  return {
    currentStx,
    suggestedStx,
    delta: +(suggestedStx - currentStx).toFixed(2),
    direction,
    rationale,
  };
}

// ============================================================================
// Convenience: convert suggestion to micro for contract calls
// ============================================================================

export const suggestionToMicro = (stx: number) => stxToMicro(stx);
