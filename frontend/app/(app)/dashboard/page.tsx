"use client";

import { TxTable } from "./TxTable";
import { useWallet } from "@/lib/useWallet";
import { microToStx } from "@/lib/stacks";
import { useEffect, useState } from "react";
import { AddressChip } from "@/components/Chips";
import { formatStx } from "@/lib/format";
import { CountUp } from "@/components/CountUp";
import { getAllWatchHistory } from "@/lib/watchHistory";

type ChainTx = {
  date: string;
  video: string;
  amount: string;
  tx: string;
};

const CONTRACT_OWNER =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";
const IS_MAINNET = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";
const HIRO = IS_MAINNET
  ? "https://api.hiro.so"
  : "https://api.testnet.hiro.so";

export default function DashboardPage() {
  const wallet = useWallet();
  const stxBalance = microToStx(wallet.balance);
  const [txs, setTxs] = useState<ChainTx[] | null>(null);
  const [earnedMicro, setEarnedMicro] = useState<bigint>(0n);
  const [watchedCount, setWatchedCount] = useState(0);

  useEffect(() => {
    setWatchedCount(getAllWatchHistory().length);
  }, []);

  useEffect(() => {
    if (!wallet.address) return;
    let cancel = false;
    (async () => {
      try {
        // Hiro's stx_inbound endpoint lists STX transfers TO this address.
        // distribute-reward sends STX from the contract → viewer.
        const res = await fetch(
          `${HIRO}/extended/v1/address/${wallet.address}/stx_inbound?limit=50`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          results?: Array<{
            sender: string;
            amount: string;
            block_height: number;
            tx_id: string;
            burn_block_time_iso?: string;
          }>;
        };

        const rewardsAddr = `${CONTRACT_OWNER}.mozoflix-rewards-v2`;
        const rewardTxs = (data.results ?? []).filter(
          (t) => t.sender === rewardsAddr,
        );

        const total = rewardTxs.reduce(
          (acc, t) => acc + BigInt(t.amount),
          0n,
        );
        if (cancel) return;
        setEarnedMicro(total);
        setTxs(
          rewardTxs.map((t) => ({
            date: (t.burn_block_time_iso ?? "").slice(0, 10),
            video: `Reward · block ${t.block_height}`,
            amount: `+${formatStx(BigInt(t.amount))} STX`,
            tx: t.tx_id,
          })),
        );
      } catch {
        if (!cancel) setTxs([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [wallet.address]);

  const lifetime = txs?.length ?? 0;

  return (
    <>
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[120px]">
        <div className="mb-2 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          Earnings Dashboard
        </div>
        <h1 className="mb-3 font-display text-[clamp(48px,5vw,80px)] uppercase leading-[0.95]">
          What MOZO has paid you so far
        </h1>
        <p className="mb-3 max-w-2xl text-[14px] font-light text-muted">
          Rewards land in your wallet the moment a video crosses 70%.
          Everything below is read straight from the chain — no off-chain magic.
        </p>
        {wallet.connected && wallet.address ? (
          <div className="mb-12">
            <AddressChip address={wallet.address} label="Wallet" />
          </div>
        ) : (
          !wallet.loading && (
            <p className="mb-12 text-[14px] text-muted">
              Connect your wallet to see your live STX balance and reward history.
            </p>
          )
        )}

        {/* Three real metrics */}
        <div className="mb-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          <StatCard
            label="Wallet Balance"
            valueNode={
              wallet.connected ? <CountUp value={stxBalance} /> : <span>—</span>
            }
            suffix="STX"
          />
          <StatCard
            label="Lifetime Rewards Earned"
            valueNode={
              wallet.connected ? (
                <CountUp value={formatStx(earnedMicro)} />
              ) : (
                <span>—</span>
              )
            }
            suffix="STX"
            highlight
          />
          <StatCard
            label="Rewards Received"
            valueNode={
              wallet.connected ? <CountUp value={lifetime} /> : <span>—</span>
            }
            hint={`${watchedCount} videos watched`}
          />
        </div>

        {/* Explanatory card — no fake "withdrawable" anymore */}
        <div className="mb-12 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-dim via-card to-card p-8">
          <div className="font-display text-h2">Where&apos;s my STX?</div>
          <p className="mt-2 max-w-2xl text-[14px] font-light text-muted">
            Already in your wallet. MOZOflix calls{" "}
            <code className="text-accent">distribute-reward</code> the moment
            you hit 70% on a video — the STX is transferred to you on-chain
            immediately. No separate &ldquo;withdraw&rdquo; step.
          </p>
        </div>

        {/* Real tx history */}
        {wallet.connected ? (
          txs === null ? (
            <div className="rounded-2xl border border-accent-border bg-card p-8 text-center text-muted">
              Loading reward history…
            </div>
          ) : txs.length === 0 ? (
            <div className="rounded-2xl border border-accent-border bg-card p-12 text-center">
              <div className="mb-3 text-4xl">💸</div>
              <h2 className="mb-2 font-display text-h2">
                No rewards yet — go earn some
              </h2>
              <p className="mx-auto max-w-md text-[14px] font-light text-muted">
                Browse a video, watch past 70%, and the STX shows up here
                automatically.
              </p>
              <a
                href="/browse"
                className="press-feedback mt-6 inline-block rounded bg-accent px-6 py-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-black hover:bg-accent-bright"
              >
                Browse videos →
              </a>
            </div>
          ) : (
            <TxTable txs={txs} />
          )
        ) : null}
      </main>
    </>
  );
}

function StatCard({
  label,
  valueNode,
  suffix,
  highlight = false,
  hint,
}: {
  label: string;
  valueNode: React.ReactNode;
  suffix?: string;
  highlight?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-8 ${
        highlight
          ? "border-accent/30 bg-card-2 shadow-[0_0_40px_rgba(255,107,0,0.1)]"
          : "border-accent-border bg-card"
      }`}
    >
      <div className="mb-3 font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
        {label}
      </div>
      <div className="font-display text-display-lg leading-none">
        <span className={highlight ? "text-accent" : "text-white"}>
          {valueNode}
        </span>
        {suffix && (
          <span className="ml-2 font-ui text-[18px] tracking-[0.1em] text-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-2 font-ui text-[10px] uppercase tracking-[0.1em] text-muted/70">
          {hint}
        </div>
      )}
    </div>
  );
}
