"use client";

import { useEffect, useState } from "react";
import { connectWallet } from "@/lib/stacks";
import {
  enabledChains,
  WALLET_METADATA,
  type ChainConfig,
  type WalletProviderId,
} from "@/lib/chains";

/**
 * NOTE (2026-08-13): ConnectKit imports removed while the EVM wallet
 * layer is being rebuilt without the Coinbase Base Account connector.
 * The EVM row below now advertises the roadmap with a "Coming soon"
 * chip instead of opening a picker. Restore the ConnectKit hook and
 * the handleEvmConnect handler when EvmProvider is switched back on.
 */

/**
 * Multi-chain wallet picker. Groups options by chain family (Stacks vs
 * EVM) and — critically — surfaces the token the viewer will earn in
 * for each choice. That's the single most important signal on this
 * modal now that connecting different wallets means earning different
 * currencies.
 */
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

  // EVM wallet flow is temporarily offline — see EvmProvider.tsx for the
  // reason. The EVM group renders as a "Coming soon" chip rather than an
  // active button so returning testers can see the roadmap.

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

  const handleStacksConnect = () => {
    onClose();
    connectWallet(() => onConnected?.());
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentHref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this URL", currentHref);
    }
  };

  const chainsToShow = enabledChains();
  const stacksChain = chainsToShow.find((c) => c.kind === "stacks");
  const evmChains = chainsToShow.filter((c) => c.kind === "evm");
  const hasEvm = evmChains.length > 0;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`relative max-h-[92vh] w-[480px] max-w-[92vw] overflow-y-auto rounded-2xl border border-accent/25 bg-card p-6 sm:p-9 transition-transform duration-300 ${
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
          Connect Wallet
        </div>
        <div className="mb-2 font-display text-[28px] leading-[1.05] tracking-[0.03em]">
          Pick your rails.
        </div>
        <p className="mb-6 text-[13px] font-light leading-relaxed text-muted">
          The wallet you connect decides what token you earn in. Every wallet
          is non-custodial — MOZOflix never holds your keys.
        </p>

        {mobileNoWallet && (
          <MobilePrompt
            currentHref={currentHref}
            copied={copied}
            onCopy={copyLink}
          />
        )}

        {/* Stacks group */}
        {stacksChain && (
          <ChainGroup
            title="Bitcoin-secured · Stacks"
            chain={stacksChain}
            wallets={stacksChain.wallets}
            onSelect={handleStacksConnect}
          />
        )}

        {/* EVM group — placeholder while the wagmi/ConnectKit stack is
            being rebuilt. Shows the promised chains so testers know
            what's coming without an active launcher that would fail. */}
        {hasEvm && (
          <div className="mt-5">
            <GroupHeader label="EVM · Base · Celo" />
            <div className="flex w-full items-center gap-4 rounded-xl border border-white/5 bg-surface/60 px-5 py-4 opacity-70">
              <span className="text-2xl grayscale">🌐</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-ui text-[14px] font-semibold text-white">
                    MetaMask · Coinbase · WalletConnect
                  </div>
                  <span className="rounded-full border border-accent/30 bg-accent-dim px-2 py-0.5 font-ui text-[9px] font-bold uppercase tracking-[0.12em] text-accent">
                    Coming soon
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-light text-muted">
                  Earn in the token of the chain you&apos;re on
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {evmChains.map((c) => (
                    <EarnPill key={c.id} chain={c} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!mobileNoWallet && (
          <p className="mt-6 text-center text-[11px] font-light text-muted">
            Don&apos;t have a wallet?{" "}
            <a
              href="https://leather.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Leather (Stacks)
            </a>
            {hasEvm && (
              <>
                {" · "}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  MetaMask (EVM)
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
      <span aria-hidden className="block h-0.5 w-6 bg-accent" />
      {label}
    </div>
  );
}

function ChainGroup({
  title,
  chain,
  wallets,
  onSelect,
}: {
  title: string;
  chain: ChainConfig;
  wallets: WalletProviderId[];
  onSelect: () => void;
}) {
  return (
    <div>
      <GroupHeader label={title} />
      <div className="mb-3 flex items-center gap-2">
        <EarnPill chain={chain} />
      </div>
      <div className="flex flex-col gap-2.5">
        {wallets.map((id) => {
          const meta = WALLET_METADATA[id];
          return (
            <button
              type="button"
              key={id}
              onClick={onSelect}
              className="group flex items-center gap-4 rounded-xl border border-accent-border bg-surface px-5 py-4 text-left transition hover:translate-x-1 hover:border-accent/40 hover:bg-accent/5"
            >
              <span className="text-2xl">{meta.icon}</span>
              <div className="flex-1">
                <div className="font-ui text-[14px] font-semibold text-white">
                  {meta.name}
                </div>
                <div className="text-[11px] font-light text-muted">
                  Earn in {chain.currency.symbol} on {chain.displayName}
                </div>
              </div>
              <span className="text-lg text-accent opacity-0 transition group-hover:opacity-100">
                →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EarnPill({ chain }: { chain: ChainConfig }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-dim px-2.5 py-0.5 font-ui text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
      {chain.currency.symbol} · {chain.displayName}
    </span>
  );
}

function MobilePrompt({
  currentHref,
  copied,
  onCopy,
}: {
  currentHref: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mb-5 rounded-xl border border-accent/30 bg-accent-dim/40 p-4">
      <div className="mb-2 flex items-center gap-2 font-ui text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
        <span className="material-symbols-outlined text-[16px]">
          phone_iphone
        </span>
        Mobile detected
      </div>
      <p className="mb-3 text-[12px] font-light leading-relaxed text-white/85">
        Extensions don&apos;t work in mobile browsers. Open this page inside
        your wallet app&apos;s built-in browser.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://connect.xverse.app/browser?url=${encodeURIComponent(
            currentHref,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-accent px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-accent-bright"
        >
          Open in Xverse
        </a>
        <a
          href={`https://metamask.app.link/dapp/${currentHref.replace(/^https?:\/\//, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-white/15 px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:border-accent hover:text-accent"
        >
          Open in MetaMask
        </a>
        <button
          type="button"
          onClick={onCopy}
          className="rounded border border-white/15 px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-white transition hover:border-accent hover:text-accent"
        >
          {copied ? "✓ Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

function detectMobileWithoutWallet(): boolean {
  if (typeof window === "undefined") return false;
  const hasLeather = "LeatherProvider" in window;
  const hasXverse =
    "XverseProviders" in window || "StacksProvider" in window;
  const hasEthProvider = "ethereum" in window;
  if (hasLeather || hasXverse || hasEthProvider) return false;

  const isCoarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const isNarrow = window.innerWidth < 900;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(
    navigator.userAgent,
  );
  return (isCoarse || uaMobile) && isNarrow;
}
