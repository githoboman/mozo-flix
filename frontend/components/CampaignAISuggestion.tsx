"use client";

import { useEffect, useState } from "react";
import { listVideos, type PoolState } from "@/lib/stacks-reads";
import {
  suggestTopUp,
  suggestRateAdjustment,
  type TopUpSuggestion,
  type RateAdjustment,
} from "@/lib/rewardOptimizer";

/**
 * Compact AI banner for a single campaign row in /studio.
 * Reads network state once on mount, computes top-up + rate-adjust hints.
 */
export function CampaignAISuggestion({
  videoId,
  pool,
  rewardPerViewMicro,
  ageBlocks,
  onApplyTopUp,
}: {
  videoId: number;
  pool: PoolState;
  rewardPerViewMicro: bigint;
  ageBlocks: number;
  onApplyTopUp: (stx: number) => void;
}) {
  const [topUp, setTopUp] = useState<TopUpSuggestion | null>(null);
  const [adj, setAdj] = useState<RateAdjustment | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const all = await listVideos();
        if (cancel) return;
        const rates = all.filter((v) => v.active).map((v) => Number(v.rewardPerView));
        rates.sort((a, b) => a - b);
        const median =
          rates.length > 0 ? rates[Math.floor(rates.length / 2)] ?? 0 : 0;

        setTopUp(suggestTopUp(pool, rewardPerViewMicro, ageBlocks));
        setAdj(
          suggestRateAdjustment(
            pool,
            rewardPerViewMicro,
            ageBlocks,
            BigInt(median),
          ),
        );
      } catch {}
    })();
    return () => {
      cancel = true;
    };
  }, [videoId, pool.balance, pool.claimCount, rewardPerViewMicro, ageBlocks]);

  if (!topUp || !adj) return null;
  if (topUp.topUpStx === 0 && adj.direction === "hold") return null;

  return (
    <div
      className={`mt-3 rounded-lg border p-3 ${
        topUp.urgent
          ? "border-red-500/40 bg-red-500/10"
          : "border-accent/30 bg-accent-dim/30"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 font-ui text-[9px] font-bold uppercase tracking-[0.2em]">
        <span
          className={`material-symbols-outlined text-[14px] ${
            topUp.urgent ? "text-red-300" : "text-accent"
          }`}
        >
          auto_awesome
        </span>
        <span className={topUp.urgent ? "text-red-300" : "text-accent"}>
          AI Suggestion
        </span>
        {topUp.urgent && (
          <span className="rounded bg-red-500/30 px-1.5 py-0.5 text-[8px] text-red-200">
            URGENT
          </span>
        )}
      </div>

      {topUp.topUpStx > 0 && (
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[11px] font-light text-muted">
            Top up{" "}
            <span className="font-bold text-white">
              {topUp.topUpStx} STX
            </span>{" "}
            to keep ~30-day runway ({topUp.daysRunway.toFixed(1)}d → {topUp.newRunwayDays.toFixed(0)}d)
          </div>
          <button
            onClick={() => onApplyTopUp(topUp.topUpStx)}
            className="shrink-0 rounded bg-accent px-3 py-1.5 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-black hover:bg-accent-bright"
          >
            Top up
          </button>
        </div>
      )}

      {adj.direction !== "hold" && (
        <div className="text-[11px] font-light text-muted">
          Consider {adj.direction === "raise" ? "raising" : "lowering"} rate from{" "}
          <span className="text-white">{adj.currentStx.toFixed(2)}</span> →{" "}
          <span className="text-accent">{adj.suggestedStx.toFixed(2)} STX</span>{" "}
          ({adj.rationale[0]})
        </div>
      )}
    </div>
  );
}
