"use client";

import { useState } from "react";

export function TopUpModal({
  open,
  onClose,
  campaign = "this campaign",
}: {
  open: boolean;
  onClose: () => void;
  campaign?: string;
}) {
  const [amount, setAmount] = useState(50);

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="animate-scale-in relative max-h-[90vh] w-[440px] max-w-[92vw] overflow-y-auto rounded-2xl border border-accent/25 bg-card p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
        <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.2em] text-accent">
          Fund Pool
        </div>
        <div className="mb-6 font-display text-[28px] leading-none">
          Top Up <span className="text-accent">{campaign}</span>
        </div>

        <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
          Amount (STX)
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mb-5 w-full rounded border border-white/10 bg-surface px-4 py-3 font-display text-2xl text-white focus:border-accent focus:outline-none"
        />

        <div className="mb-5 rounded-lg border border-accent-border bg-surface p-4 text-[12px]">
          <div className="mb-1 flex justify-between text-muted">
            <span>Top-up</span>
            <span className="font-ui text-white">{amount.toFixed(2)} STX</span>
          </div>
          <div className="mb-1 flex justify-between text-muted">
            <span>Platform fee (5%)</span>
            <span className="font-ui">{(amount * 0.05).toFixed(3)} STX</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/5 pt-2">
            <span className="font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
              Net to pool
            </span>
            <span className="font-display text-base text-accent">
              {(amount * 0.95).toFixed(3)} STX
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            // TODO: contract-call .mozoflix-rewards fund-pool
            onClose();
          }}
          className="w-full rounded bg-accent py-4 font-ui text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-accent-bright hover:shadow-glow-lg"
        >
          Sign &amp; Fund Pool →
        </button>
      </div>
    </div>
  );
}
