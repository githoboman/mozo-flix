"use client";

import { useEffect, useState } from "react";
import { listVideos } from "@/lib/stacks-reads";
import { suggestRewardForUpload, type RewardSuggestion } from "@/lib/rewardOptimizer";

/**
 * Inline AI suggestion for a new upload's reward rate + pool size.
 * Renders compact card with "Apply" buttons that call setters from the parent.
 */
export function RewardSuggestionWidget({
  category,
  onApplyReward,
  onApplyPool,
}: {
  category?: string;
  onApplyReward: (stx: number) => void;
  onApplyPool: (stx: number) => void;
}) {
  const [suggestion, setSuggestion] = useState<RewardSuggestion | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const all = await listVideos();
        if (!cancel) setSuggestion(suggestRewardForUpload(all, category));
      } catch {
        if (!cancel) setSuggestion(null);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [category]);

  if (!suggestion) {
    return (
      <div className="rounded-xl border border-accent/20 bg-accent-dim/30 p-4">
        <div className="font-ui text-[10px] uppercase tracking-[0.2em] text-accent">
          AI · loading network data…
        </div>
      </div>
    );
  }

  const confidenceColor =
    suggestion.confidence === "high"
      ? "text-green-300"
      : suggestion.confidence === "medium"
      ? "text-amber-300"
      : "text-muted";

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-dim/30 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="material-symbols-outlined text-[14px]">
            auto_awesome
          </span>
          AI Reward Optimizer
        </div>
        <span className={`font-ui text-[9px] uppercase tracking-[0.15em] ${confidenceColor}`}>
          {suggestion.confidence} confidence
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/5 bg-surface p-3">
          <div className="mb-1 font-ui text-[9px] uppercase tracking-[0.15em] text-muted">
            Suggested reward
          </div>
          <div className="font-display text-2xl text-accent">
            {suggestion.rewardPerViewStx}
            <span className="ml-1 text-[12px] text-muted">STX/view</span>
          </div>
          <button
            type="button"
            onClick={() => onApplyReward(suggestion.rewardPerViewStx)}
            className="mt-2 w-full rounded bg-accent/20 px-2 py-1 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-accent hover:bg-accent/30"
          >
            Apply →
          </button>
        </div>
        <div className="rounded-lg border border-white/5 bg-surface p-3">
          <div className="mb-1 font-ui text-[9px] uppercase tracking-[0.15em] text-muted">
            Suggested pool
          </div>
          <div className="font-display text-2xl text-white">
            {suggestion.poolStx}
            <span className="ml-1 text-[12px] text-muted">STX</span>
          </div>
          <button
            type="button"
            onClick={() => onApplyPool(suggestion.poolStx)}
            className="mt-2 w-full rounded bg-accent/20 px-2 py-1 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-accent hover:bg-accent/30"
          >
            Apply →
          </button>
        </div>
      </div>

      <ul className="space-y-1">
        {suggestion.rationale.map((r, i) => (
          <li key={i} className="flex gap-2 text-[11px] font-light text-muted">
            <span className="text-accent">·</span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
