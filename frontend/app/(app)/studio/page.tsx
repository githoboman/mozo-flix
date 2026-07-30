"use client";

import { LiveCampaignsTable } from "./LiveCampaignsTable";
import { AdminFeeBanner } from "@/components/AdminFeeBanner";
import { WithdrawFeesPanel } from "@/components/WithdrawFeesPanel";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/useWallet";
import {
  listVideos,
  getPool,
  type VideoMeta,
  type PoolState,
} from "@/lib/stacks-reads";
import { microToStx } from "@/lib/stacks";
import { getVideoMeta } from "@/lib/videoMeta";
import { AddressChip } from "@/components/Chips";
import { fetchManifest, extractCid } from "@/lib/manifest";

const RETENTION = [
  100, 98, 96, 94, 92, 89, 86, 84, 82, 80, 78, 75, 73, 71, 70, 68, 67, 65, 63, 60,
];
const TRAFFIC = [
  { source: "Subscriptions feed", pct: 38 },
  { source: "Search", pct: 22 },
  { source: "External (Twitter)", pct: 18 },
  { source: "Suggested videos", pct: 14 },
  { source: "Channel page", pct: 8 },
];

export type Campaign = {
  id: number;
  title: string;
  funded: bigint;
  distributed: bigint;
  balance: bigint;
  claimCount: number;
  active: boolean;
  rewardPerViewMicro: bigint;
  createdAt: number;
};

export default function StudioPage() {
  const wallet = useWallet();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);

  useEffect(() => {
    if (!wallet.address) return;
    let cancel = false;
    (async () => {
      const all = await listVideos();
      const owned = all.filter((v) => v.creator === wallet.address);
      const enriched = await Promise.all(
        owned.map(async (v: VideoMeta) => {
          const p: PoolState = await getPool(v.id);
          // Prefer manifest title (works for everyone), fall back to local cache.
          const cid = extractCid(v.contentHash);
          const manifest = cid ? await fetchManifest(cid) : null;
          const m = getVideoMeta(v.id);
          const title = manifest?.title || m?.title || `Video #${v.id}`;
          return {
            id: v.id,
            title,
            funded: p.totalFunded,
            distributed: p.totalDistributed,
            balance: p.balance,
            claimCount: p.claimCount,
            active: v.active,
            rewardPerViewMicro: v.rewardPerView,
            createdAt: v.createdAt,
          };
        }),
      );
      if (!cancel) setCampaigns(enriched);
    })();
    return () => {
      cancel = true;
    };
  }, [wallet.address]);

  const totals = campaigns?.reduce(
    (acc, c) => ({
      balance: acc.balance + c.balance,
      distributed: acc.distributed + c.distributed,
      claims: acc.claims + c.claimCount,
    }),
    { balance: 0n, distributed: 0n, claims: 0 },
  ) ?? { balance: 0n, distributed: 0n, claims: 0 };

  return (
    <>
      <main className="mx-auto max-w-[1500px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[100px]">
        <div className="mb-2 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          Creator Studio
        </div>
        <h1 className="mb-3 font-display text-[clamp(48px,5vw,80px)] uppercase leading-[0.95]">
          Channel <span className="text-accent">Analytics</span>
        </h1>
        {wallet.address && (
          <div className="mb-10 flex flex-wrap items-center gap-3">
            <AddressChip address={wallet.address} label="Owner" />
            {wallet.address ===
              (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
                "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E") && (
              <a
                href="/studio/moderation"
                className="inline-flex items-center gap-2 rounded border border-accent/30 bg-accent-dim px-3 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-accent transition hover:border-accent hover:bg-accent hover:text-black"
              >
                <span className="material-symbols-outlined text-[14px]">
                  shield
                </span>
                Moderation
              </a>
            )}
          </div>
        )}
        {!wallet.connected && !wallet.loading && (
          <p className="mb-10 text-[14px] text-muted">
            Connect your wallet to see your campaigns.
          </p>
        )}

        <AdminFeeBanner />
        <WithdrawFeesPanel />

        <div className="mb-10 grid grid-cols-2 gap-5 md:grid-cols-4">
          <Stat
            label="Total Pool Balance"
            value={microToStx(totals.balance)}
            suffix="STX"
            highlight
          />
          <Stat
            label="Total Distributed"
            value={microToStx(totals.distributed)}
            suffix="STX"
          />
          <Stat label="Verified Views" value={String(totals.claims)} />
          <Stat label="Active Videos" value={String(campaigns?.length ?? 0)} />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-accent-border bg-card p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-h2">Audience Retention</h2>
              <span className="rounded bg-amber-500/15 px-2 py-1 font-ui text-[9px] uppercase tracking-[0.15em] text-amber-300">
                Demo · needs watch-event index
              </span>
            </div>
            <div className="flex h-48 items-end gap-1">
              {RETENTION.map((r, i) => (
                <div key={i} className="flex-1">
                  <div
                    className={`w-full rounded-t-sm transition ${
                      i < 14 ? "bg-accent" : "bg-accent/40"
                    }`}
                    style={{ height: `${r}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
              <span>0%</span>
              <span className="text-accent">↑ 70% reward gate</span>
              <span>100%</span>
            </div>
            <p className="mt-3 text-[10px] text-muted/60">
              Demo curve — real retention requires watch-event aggregation
              (coming with Firebase wiring).
            </p>
          </div>

          <div className="rounded-2xl border border-accent-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-h2">Traffic Sources</h2>
              <span className="rounded bg-amber-500/15 px-2 py-1 font-ui text-[9px] uppercase tracking-[0.15em] text-amber-300">
                Demo
              </span>
            </div>
            <div className="space-y-4">
              {TRAFFIC.map((t) => (
                <div key={t.source}>
                  <div className="mb-1.5 flex justify-between text-[12px]">
                    <span className="text-muted">{t.source}</span>
                    <span className="font-ui text-white">{t.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-sm bg-white/5">
                    <div
                      className="h-full rounded-sm bg-gradient-to-r from-accent to-accent-bright"
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <LiveCampaignsTable campaigns={campaigns} />
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  suffix,
  highlight = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight ? "border-accent/30 bg-card-2" : "border-accent-border bg-card"
      }`}
    >
      <div className="mb-3 font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
        {label}
      </div>
      <div className="font-display text-h1 leading-none">
        <span className={highlight ? "text-accent" : "text-white"}>{value}</span>
        {suffix && (
          <span className="ml-1.5 font-ui text-[14px] tracking-[0.1em] text-muted">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
