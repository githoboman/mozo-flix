"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CampaignAISuggestion } from "@/components/CampaignAISuggestion";
import {
  fundPool,
  withdrawPool,
  setVideoActive,
  stxToMicro,
  microToStx,
} from "@/lib/stacks";
import { useWallet } from "@/lib/useWallet";
import { getVideoMeta } from "@/lib/videoMeta";
import { useToast } from "@/components/Toast";
import { explorerTxUrl, watchUrl } from "@/lib/format";
import { friendlyError } from "@/lib/errorMessage";
import type { Campaign } from "./page";

export function LiveCampaignsTable({
  campaigns,
}: {
  campaigns: Campaign[] | null;
}) {
  const wallet = useWallet();
  const toast = useToast();
  const [topUpFor, setTopUpFor] = useState<Campaign | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(5);
  const [busy, setBusy] = useState<{ id: number; action: string } | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number>(0);

  useEffect(() => {
    const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";
    const api = isMainnet
      ? "https://api.hiro.so"
      : "https://api.testnet.hiro.so";
    fetch(`${api}/v2/info`)
      .then((r) => r.json())
      .then((d) => setCurrentBlock(d.stacks_tip_height ?? 0))
      .catch(() => {});
  }, []);

  const onFund = async () => {
    if (!topUpFor || !wallet.address) return;
    const id = topUpFor.id;
    const amount = topUpAmount;
    const title = topUpFor.title;
    setBusy({ id, action: "fund" });
    try {
      await fundPool(id, stxToMicro(amount), wallet.address, (txId) => {
        toast.show({
          kind: "success",
          title: "Funding submitted",
          body: `${amount} STX → ${title}`,
          action: { label: "View tx", href: explorerTxUrl(txId) },
        });
      });
      setTopUpFor(null);
    } catch (e) {
      toast.show({
        kind: "error",
        title: "Fund failed",
        body: friendlyError(e),
      });
    } finally {
      setBusy(null);
    }
  };

  const onWithdraw = async (id: number) => {
    setBusy({ id, action: "withdraw" });
    try {
      await withdrawPool(id, (txId) => {
        toast.show({
          kind: "success",
          title: "Withdrawal submitted",
          body: `Video #${id} pool funds → your wallet`,
          action: { label: "View tx", href: explorerTxUrl(txId) },
        });
      });
    } catch (e) {
      toast.show({
        kind: "error",
        title: "Withdrawal failed",
        body: friendlyError(e),
      });
    } finally {
      setBusy(null);
    }
  };

  const onToggleActive = async (id: number, active: boolean) => {
    setBusy({ id, action: "toggle" });
    try {
      await setVideoActive(id, !active, (txId) => {
        toast.show({
          kind: "success",
          title: active ? "Video deactivated" : "Video reactivated",
          body: `#${id} ${active ? "hidden from feed" : "back on the feed"}`,
          action: { label: "View tx", href: explorerTxUrl(txId) },
        });
      });
    } catch (e) {
      toast.show({
        kind: "error",
        title: "Update failed",
        body: friendlyError(e),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-10 rounded-2xl border border-accent-border bg-card">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-5 md:px-8 md:py-6">
        <h2 className="font-display text-h2">Your Campaigns</h2>
        <Link
          href="/upload"
          className="rounded bg-accent px-5 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-black hover:bg-accent-bright"
        >
          + New Campaign
        </Link>
      </div>

      {campaigns === null ? (
        <div className="p-12 text-center text-muted">Loading from chain…</div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center text-muted">
          No campaigns yet. Upload a video to start.
        </div>
      ) : (
        <div className="stagger-children divide-y divide-white/5">
          {campaigns.map((c) => {
            const meta = getVideoMeta(c.id);
            const isLegacy = !meta?.videoCid;
            return (
            <div
              key={c.id}
              className={`grid grid-cols-12 items-center gap-4 px-5 py-6 transition hover:bg-white/[0.02] md:px-8 ${
                !c.active ? "opacity-60" : ""
              }`}
            >
              <div className="col-span-12 md:col-span-3">
                <Link
                  href={watchUrl(c.id, c.title)}
                  className="font-ui text-[14px] font-bold hover:text-accent"
                >
                  {c.title}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 font-ui text-[9px] uppercase tracking-[0.1em] ${
                      c.active
                        ? "bg-accent-dim text-accent"
                        : "bg-white/5 text-muted"
                    }`}
                  >
                    {c.active ? "Active" : "Deactivated"}
                  </span>
                  {isLegacy && (
                    <span
                      className="rounded bg-amber-500/15 px-2 py-0.5 font-ui text-[9px] uppercase tracking-[0.1em] text-amber-300"
                      title="No IPFS file attached — registered before the upload pipeline existed"
                    >
                      Legacy
                    </span>
                  )}
                  <span className="text-[11px] text-muted">
                    {c.claimCount} claims
                  </span>
                </div>
              </div>
              <Metric col="col-span-4 md:col-span-2" label="Balance" value={`${microToStx(c.balance)} STX`} accent />
              <Metric col="col-span-4 md:col-span-2" label="Funded" value={`${microToStx(c.funded)} STX`} />
              <Metric col="col-span-4 md:col-span-2" label="Distributed" value={`${microToStx(c.distributed)} STX`} />
              <div className="col-span-12 flex flex-wrap justify-end gap-2 md:col-span-3">
                <button
                  onClick={() => {
                    setTopUpFor(c);
                    setTopUpAmount(5);
                  }}
                  disabled={busy?.id === c.id || !c.active || isLegacy}
                  title={
                    isLegacy
                      ? "Legacy entry — no IPFS file. Deactivate this and upload a new one."
                      : !c.active
                      ? "Reactivate this video before funding it."
                      : undefined
                  }
                  className="rounded bg-accent px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-black hover:bg-accent-bright disabled:opacity-40"
                >
                  {busy?.id === c.id && busy.action === "fund"
                    ? "Funding…"
                    : "Fund Pool"}
                </button>
                <button
                  onClick={() => onWithdraw(c.id)}
                  disabled={c.balance === 0n || busy?.id === c.id}
                  className="rounded border border-white/10 px-3 py-2 font-ui text-[10px] uppercase tracking-[0.1em] text-muted hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  {busy?.id === c.id && busy.action === "withdraw"
                    ? "…"
                    : "Withdraw"}
                </button>
                <button
                  onClick={() => onToggleActive(c.id, c.active)}
                  disabled={busy?.id === c.id}
                  className={`rounded border px-3 py-2 font-ui text-[10px] uppercase tracking-[0.1em] transition disabled:opacity-40 ${
                    c.active
                      ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
                      : "border-green-500/30 text-green-300 hover:bg-green-500/10"
                  }`}
                  title={
                    c.active
                      ? "Hides the video from the public feed and stops new claims. On-chain record stays."
                      : "Re-list this video on the public feed."
                  }
                >
                  {busy?.id === c.id && busy.action === "toggle"
                    ? "…"
                    : c.active
                    ? "Deactivate"
                    : "Reactivate"}
                </button>
              </div>
              {c.active && !isLegacy && (
                <div className="col-span-12">
                  <CampaignAISuggestion
                    videoId={c.id}
                    pool={{
                      balance: c.balance,
                      totalFunded: c.funded,
                      totalDistributed: c.distributed,
                      claimCount: c.claimCount,
                    }}
                    rewardPerViewMicro={c.rewardPerViewMicro}
                    ageBlocks={Math.max(0, currentBlock - c.createdAt)}
                    onApplyTopUp={(stx) => {
                      setTopUpFor(c);
                      setTopUpAmount(stx);
                    }}
                  />
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {topUpFor && (
        <div
          onClick={(e) => e.target === e.currentTarget && setTopUpFor(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <div className="w-[440px] max-w-[90vw] rounded-2xl border border-accent/25 bg-card p-8">
            <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.2em] text-accent">
              Fund Pool
            </div>
            <div className="mb-6 font-display text-[28px] leading-none">
              {topUpFor.title}
            </div>
            <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
              Amount (STX)
            </div>
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(Number(e.target.value))}
              className="mb-5 w-full rounded border border-white/10 bg-surface px-4 py-3 font-display text-2xl text-white focus:border-accent focus:outline-none"
            />
            <div className="mb-5 rounded-lg border border-accent-border bg-surface p-4 text-[12px]">
              <div className="mb-1 flex justify-between text-muted">
                <span>Top-up</span>
                <span className="font-ui text-white">
                  {topUpAmount.toFixed(2)} STX
                </span>
              </div>
              <div className="mb-1 flex justify-between text-muted">
                <span>Platform fee (5%)</span>
                <span className="font-ui">
                  {(topUpAmount * 0.05).toFixed(3)} STX
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-white/5 pt-2">
                <span className="font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
                  Net to pool
                </span>
                <span className="font-display text-base text-accent">
                  {(topUpAmount * 0.95).toFixed(3)} STX
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTopUpFor(null)}
                className="flex-1 rounded border border-white/10 py-3 font-ui text-[11px] uppercase text-muted"
              >
                Cancel
              </button>
              <button
                onClick={onFund}
                disabled={!wallet.address || topUpAmount <= 0}
                className="flex-1 rounded bg-accent py-3 font-ui text-[12px] font-bold uppercase text-black hover:bg-accent-bright disabled:opacity-50"
              >
                Sign & Fund →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  col,
  label,
  value,
  accent = false,
}: {
  col: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={col}>
      <div className="font-ui text-[9px] uppercase tracking-[0.15em] text-muted">
        {label}
      </div>
      <div
        className={`font-display text-2xl leading-none ${
          accent ? "text-accent" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
