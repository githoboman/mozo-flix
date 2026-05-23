"use client";

import { useState } from "react";
import {
  shortAddress,
  shortTx,
  explorerAddressUrl,
  explorerTxUrl,
} from "@/lib/format";

/**
 * Copyable address chip. Click → copy. External icon → open explorer.
 */
export function AddressChip({
  address,
  label,
  variant = "default",
}: {
  address: string;
  label?: string;
  variant?: "default" | "compact";
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={copy}
        title={`Click to copy ${address}`}
        className={`group inline-flex items-center gap-1 rounded border border-white/10 bg-card-2 font-mono transition hover:border-accent/40 hover:bg-accent-dim/30 ${
          variant === "compact"
            ? "px-1.5 py-0.5 text-[10px]"
            : "px-2 py-1 text-[11px]"
        }`}
      >
        {label && (
          <span className="font-ui text-[9px] uppercase tracking-[0.1em] text-muted">
            {label}:
          </span>
        )}
        <span className="text-white/90">{shortAddress(address)}</span>
        <span
          className={`material-symbols-outlined text-[12px] transition ${
            copied ? "text-green-300" : "text-muted group-hover:text-accent"
          }`}
        >
          {copied ? "check" : "content_copy"}
        </span>
      </button>
      <a
        href={explorerAddressUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        title="View on explorer"
        className="text-muted hover:text-accent"
      >
        <span className="material-symbols-outlined text-[14px]">
          open_in_new
        </span>
      </a>
    </span>
  );
}

/**
 * Copyable transaction hash chip with explorer link.
 */
export function TxChip({
  tx,
  label,
}: {
  tx: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(tx);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={copy}
        title={`Click to copy ${tx}`}
        className="group inline-flex items-center gap-1 rounded border border-white/10 bg-card-2 px-2 py-1 font-mono text-[11px] transition hover:border-accent/40 hover:bg-accent-dim/30"
      >
        {label && (
          <span className="font-ui text-[9px] uppercase tracking-[0.1em] text-muted">
            {label}:
          </span>
        )}
        <span className="text-white/90">{shortTx(tx)}</span>
        <span
          className={`material-symbols-outlined text-[12px] transition ${
            copied ? "text-green-300" : "text-muted group-hover:text-accent"
          }`}
        >
          {copied ? "check" : "content_copy"}
        </span>
      </button>
      <a
        href={explorerTxUrl(tx)}
        target="_blank"
        rel="noopener noreferrer"
        title="View on explorer"
        className="text-muted hover:text-accent"
      >
        <span className="material-symbols-outlined text-[14px]">
          open_in_new
        </span>
      </a>
    </span>
  );
}
