"use client";

import { useEffect, useState } from "react";
import { connectWallet } from "@/lib/stacks";

type WalletOption = {
  name: string;
  icon: string;
  description: string;
  /** Deep-link that opens the current site inside the wallet's in-app browser. Used only on mobile. */
  mobileOpenUrl?: (currentHref: string) => string;
  /** Where to download the wallet if the user doesn't have it. */
  installUrl: string;
};

const WALLETS: WalletOption[] = [
  {
    name: "Xverse",
    icon: "🔵",
    description: "Mobile & browser · BTC, STX, Ordinals",
    mobileOpenUrl: (href) =>
      `https://connect.xverse.app/browser?url=${encodeURIComponent(href)}`,
    installUrl: "https://www.xverse.app/download",
  },
  {
    name: "Leather Wallet",
    icon: "🟤",
    description: "Browser extension · Bitcoin & Stacks",
    installUrl: "https://leather.io/install-extension",
  },
  {
    name: "Boom Wallet",
    icon: "💥",
    description: "Web wallet · Fast Stacks onboarding",
    installUrl: "https://www.boomwallet.app/",
  },
];

/**
 * True when we're in a mobile browser context where injected browser-extension
 * wallets don't exist. We check `pointer: coarse` (touch-first devices) and
 * fall back to a UA sniff for older WebViews. This is deliberately generous —
 * false positives here just mean we show extra help; false negatives mean the
 * user hits a dead "Connect" button.
 */
function detectMobileWithoutWallet(): boolean {
  if (typeof window === "undefined") return false;
  const hasLeather = "LeatherProvider" in window;
  const hasXverse =
    "XverseProviders" in window ||
    // Some Xverse builds inject StacksProvider directly
    "StacksProvider" in window;
  if (hasLeather || hasXverse) return false;

  const isCoarse =
    window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const isNarrow = window.innerWidth < 900;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
    navigator.userAgent,
  );
  return (isCoarse || uaMobile) && isNarrow;
}

export function WalletModal({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
}) {
  const [mobileNoWallet, setMobileNoWallet] = useState(false);
  const [currentHref, setCurrentHref] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMobileNoWallet(detectMobileWithoutWallet());
    setCurrentHref(window.location.href);
    setCopied(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleConnect = () => {
    onClose();
    connectWallet(() => {
      onConnected?.();
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentHref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some in-app browsers block clipboard — fall back to prompt
      window.prompt("Copy this URL", currentHref);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`relative max-h-[92vh] w-[440px] max-w-[92vw] overflow-y-auto rounded-2xl border border-accent/25 bg-card p-6 sm:p-10 transition-transform duration-300 ${
          open ? "scale-100 translate-y-0" : "scale-90 translate-y-5"
        }`}
      >
        <button
          type="button"
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
        <p className="mb-6 text-[13px] font-light text-muted">
          No email. No password. Your wallet is your identity — and your reward
          destination.
        </p>

        {mobileNoWallet && (
          <div className="mb-5 rounded-xl border border-accent/30 bg-accent-dim/40 p-4">
            <div className="mb-2 flex items-center gap-2 font-ui text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
              <span className="material-symbols-outlined text-[16px]">
                phone_iphone
              </span>
              Mobile detected
            </div>
            <p className="mb-3 text-[12px] font-light leading-relaxed text-white/85">
              Wallet extensions only work in desktop browsers. On mobile,
              open this page inside your wallet app&apos;s built-in browser
              to connect.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={
                  WALLETS[0]!.mobileOpenUrl?.(currentHref) ??
                  WALLETS[0]!.installUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-accent px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-accent-bright"
              >
                Open in Xverse
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="rounded border border-white/15 px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:border-accent hover:text-accent"
              >
                {copied ? "✓ Copied" : "Copy link"}
              </button>
            </div>
            <p className="mt-3 text-[10px] font-light text-muted">
              Don&apos;t have a wallet? Install{" "}
              <a
                href="https://www.xverse.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Xverse
              </a>{" "}
              or{" "}
              <a
                href="https://leather.io/install-mobile-app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Leather mobile
              </a>{" "}
              first.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {WALLETS.map((w) => (
            <button
              type="button"
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

        {!mobileNoWallet && (
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
        )}
      </div>
    </div>
  );
}
