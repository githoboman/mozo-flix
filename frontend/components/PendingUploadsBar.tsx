"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/useWallet";
import {
  getPendingUploads,
  removePendingUpload,
  type PendingUpload,
} from "@/lib/pendingUploads";
import { explorerTxUrl } from "@/lib/format";
import { ipfsToUrl } from "@/lib/ipfs";

/**
 * Sits at the top of /browse and /library. When the connected wallet has
 * uploads whose register-and-fund tx is still confirming, we show them
 * here so testers immediately see that their video is "coming".
 *
 * Rows auto-disappear once the on-chain listing includes their id
 * (DataProvider reconciles the pending set on every successful listVideos).
 */
export function PendingUploadsBar() {
  const wallet = useWallet();
  const [pending, setPending] = useState<PendingUpload[]>([]);

  useEffect(() => {
    if (!wallet.address) {
      setPending([]);
      return;
    }
    // Read + re-read once a minute so the display picks up reconciliations
    // that happen elsewhere in the app.
    const load = () => setPending(getPendingUploads(wallet.address!));
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [wallet.address]);

  if (!pending.length) return null;

  return (
    <div className="mb-6 rounded-xl border border-accent/25 bg-accent-dim/30 p-4">
      <div className="mb-3 flex items-center gap-2 font-ui text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
        <span className="material-symbols-outlined text-[16px] animate-pulse">
          hourglass_top
        </span>
        {pending.length} upload{pending.length === 1 ? "" : "s"} registering on-chain
      </div>
      <div className="flex flex-col gap-2">
        {pending.map((p) => (
          <div
            key={p.expectedId}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-surface p-2"
          >
            {p.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  p.thumbnail.startsWith("ipfs://")
                    ? ipfsToUrl(p.thumbnail)
                    : p.thumbnail
                }
                alt={p.title}
                className="h-12 w-20 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-12 w-20 shrink-0 rounded bg-gradient-to-br from-accent/20 to-black" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-ui text-[13px] font-semibold text-white">
                {p.title || `Video #${p.expectedId}`}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                <span>
                  Registering as <span className="text-accent">#{p.expectedId}</span>
                </span>
                <span>·</span>
                <a
                  href={explorerTxUrl(p.registerTx)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-accent hover:underline"
                >
                  {p.registerTx.slice(0, 10)}…
                </a>
                <span>·</span>
                <span>~10 min on testnet</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                removePendingUpload(p.expectedId);
                setPending((cur) =>
                  cur.filter((c) => c.expectedId !== p.expectedId),
                );
              }}
              className="rounded p-1 text-muted hover:text-white"
              aria-label="Dismiss"
              title="Dismiss (won't affect the on-chain tx)"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
