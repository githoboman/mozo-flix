"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/useWallet";
import { withdrawFees, microToStx } from "@/lib/stacks";
import { getAdminConfig } from "@/lib/stacks-reads";

/** Reads fees-collected from the v2 rewards contract via fetch. */
async function fetchFeesCollected(contractOwner: string): Promise<bigint> {
  const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";
  const api = isMainnet ? "https://api.hiro.so" : "https://api.testnet.hiro.so";
  try {
    const res = await fetch(
      `${api}/v2/contracts/call-read/${contractOwner}/mozoflix-rewards-v2/get-fees-collected`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: contractOwner, arguments: [] }),
      },
    );
    const data = await res.json();
    if (!data?.result) return 0n;
    // result is hex: 0x01 + 16-byte big-endian uint
    const hex = data.result.replace(/^0x/, "");
    return BigInt("0x" + hex.slice(2));
  } catch {
    return 0n;
  }
}

export function WithdrawFeesPanel() {
  const wallet = useWallet();
  const [isOwner, setIsOwner] = useState(false);
  const [fees, setFees] = useState<bigint>(0n);
  const [busy, setBusy] = useState(false);
  const [txid, setTxid] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet.address) return;
    (async () => {
      const cfg = await getAdminConfig();
      setIsOwner(wallet.address === cfg.owner);
      if (wallet.address === cfg.owner) {
        const f = await fetchFeesCollected(cfg.owner);
        setFees(f);
      }
    })();
  }, [wallet.address]);

  if (!isOwner) return null;

  const onWithdraw = async () => {
    if (!wallet.address) return;
    setBusy(true);
    try {
      await withdrawFees(wallet.address, (id) => {
        setTxid(id);
        setBusy(false);
      });
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-accent/30 bg-card-2 p-6">
      <div className="mb-1 flex items-center gap-3 font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
        <span className="block h-0.5 w-8 bg-accent" />
        Platform Treasury
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-display text-[36px] leading-none">
            {microToStx(fees)}
            <span className="ml-2 font-ui text-[14px] tracking-[0.1em] text-muted">
              STX accrued in fees
            </span>
          </div>
          <p className="mt-2 text-[11px] font-light text-muted">
            Escrowed inside <code className="text-accent">mozoflix-rewards-v2</code>.
            Owner can sweep to any address.
          </p>
          {txid && (
            <p className="mt-2 text-[11px] text-green-300">
              ✓ Sweep tx:{" "}
              <a
                href={`https://explorer.hiro.so/txid/${txid}?chain=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-mono underline"
              >
                {txid.slice(0, 14)}…
              </a>
            </p>
          )}
        </div>
        <button
          onClick={onWithdraw}
          disabled={busy || fees === 0n}
          className="rounded bg-accent px-5 py-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-accent-bright disabled:opacity-40"
        >
          {busy ? "Confirm in wallet…" : "Sweep to my wallet"}
        </button>
      </div>
    </div>
  );
}
