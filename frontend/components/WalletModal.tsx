"use client";

import { useEffect } from "react";
import { connectWallet } from "@/lib/stacks";

const WALLETS = [
  {
    name: "Leather Wallet",
    icon: "🟤",
    description: "Browser extension · Bitcoin & Stacks",
  },
  {
    name: "Xverse",
    icon: "🔵",
    description: "Mobile & browser · BTC, STX, Ordinals",
  },
  {
    name: "Boom Wallet",
    icon: "💥",
    description: "Web wallet · Fast Stacks onboarding",
  },
];

export function WalletModal({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleConnect = () => {
    onClose();
    connectWallet(() => {
      onConnected?.();
    });
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`relative w-[420px] max-w-[90vw] rounded-2xl border border-accent/25 bg-card p-6 sm:p-10 transition-transform duration-300 ${
          open ? "scale-100 translate-y-0" : "scale-90 translate-y-5"
        }`}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>

        <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.2em] text-accent">
          Stacks Wallet
        </div>
        <div className="mb-2 font-display text-[32px] tracking-[0.03em]">
          CONNECT WALLET
        </div>
        <p className="mb-7 text-[13px] font-light text-muted">
          No email. No password. Your wallet is your identity — and your reward
          destination.
        </p>

        <div className="flex flex-col gap-2.5">
          {WALLETS.map((w) => (
            <button
              key={w.name}
              onClick={handleConnect}
              className="group flex items-center gap-4 rounded-xl border border-accent-border bg-surface px-5 py-4 text-left transition hover:translate-x-1 hover:border-accent/40 hover:bg-accent/5"
            >
              <span className="text-2xl">{w.icon}</span>
              <div className="flex-1">
                <div className="font-ui text-[14px] font-semibold text-white">
                  {w.name}
                </div>
                <div className="text-[11px] font-light text-muted">
                  {w.description}
                </div>
              </div>
              <span className="text-lg text-accent opacity-0 transition group-hover:opacity-100">
                →
              </span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] font-light text-muted">
          Don&apos;t have a wallet?{" "}
          <a
            href="https://leather.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Get Leather free →
          </a>
        </p>
      </div>
    </div>
  );
}
