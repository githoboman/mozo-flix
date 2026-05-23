"use client";

import { useState } from "react";
import { sendStxTip, stxToMicro } from "@/lib/stacks";
import { useToast } from "./Toast";
import { explorerTxUrl } from "@/lib/format";

const PRESETS = [0.5, 1, 5, 10];

export function TipModal({
  open,
  onClose,
  creator,
  creatorAddress,
}: {
  open: boolean;
  onClose: () => void;
  creator?: string;
  creatorAddress?: string;
}) {
  // Don't surface raw wallet addresses as a name in the UI.
  const isAddressLike =
    !!creator && /^S[TPMN][0-9A-Z]{20,}…[0-9A-Z]{2,}$/i.test(creator);
  const displayName = creator && !isAddressLike ? creator : "this creator";
  const toastTarget = creator && !isAddressLike ? creator : "creator";
  const toast = useToast();
  const [amount, setAmount] = useState(1);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "signing" }
    | { kind: "sent"; txid: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

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
          Super Chat
        </div>
        <div className="mb-6 font-display text-[32px] leading-none">
          Tip <span className="text-accent">{displayName}</span>
        </div>

        <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
          Amount (STX)
        </div>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`rounded border py-3 font-ui text-[14px] font-bold transition ${
                amount === p
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 bg-surface text-muted hover:border-white/30 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mb-5 w-full rounded border border-white/10 bg-surface px-4 py-3 font-display text-2xl text-white focus:border-accent focus:outline-none"
        />

        <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
          Message (optional)
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Say something nice..."
          className="mb-6 w-full resize-none rounded border border-white/10 bg-surface p-3 text-[13px] text-white placeholder-muted focus:border-accent focus:outline-none"
        />

        <div className="mb-5 rounded-lg border border-accent-border bg-surface p-4 text-[12px]">
          <div className="mb-1 flex justify-between text-muted">
            <span>Tip</span>
            <span className="font-ui text-white">{amount.toFixed(2)} STX</span>
          </div>
          <div className="mb-1 flex justify-between text-muted">
            <span>Platform fee (5%)</span>
            <span className="font-ui">{(amount * 0.05).toFixed(3)} STX</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/5 pt-2">
            <span className="font-ui text-[11px] uppercase tracking-[0.1em] text-muted">
              Creator receives
            </span>
            <span className="font-display text-base text-accent">
              {(amount * 0.95).toFixed(3)} STX
            </span>
          </div>
        </div>

        {!creatorAddress && (
          <div className="mb-3 rounded border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200/80">
            Creator address unknown — can&apos;t target the transfer.
          </div>
        )}
        {status.kind === "sent" && (
          <div className="mb-3 rounded border border-green-500/40 bg-green-500/10 p-3 text-[11px] text-green-200">
            ✓ Tip broadcast.{" "}
            <a
              href={`https://explorer.hiro.so/txid/${status.txid}?chain=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono underline"
            >
              {status.txid.slice(0, 12)}…
            </a>
          </div>
        )}
        {status.kind === "error" && (
          <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-[11px] text-red-300">
            {status.message}
          </div>
        )}
        <button
          onClick={async () => {
            if (!creatorAddress) {
              setStatus({ kind: "error", message: "Missing creator address." });
              return;
            }
            setStatus({ kind: "signing" });
            try {
              await sendStxTip(
                creatorAddress,
                stxToMicro(amount),
                message,
                (txid) => {
                  setStatus({ kind: "sent", txid });
                  toast.show({
                    kind: "success",
                    title: "Tip sent",
                    body: `${amount} STX → ${toastTarget}`,
                    action: { label: "View tx", href: explorerTxUrl(txid) },
                  });
                  // Close after a beat so user sees the receipt
                  setTimeout(() => onClose(), 1500);
                },
              );
            } catch (e) {
              const msg = (e as Error).message;
              setStatus({ kind: "error", message: msg });
              toast.show({
                kind: "error",
                title: "Tip failed",
                body: msg,
              });
            }
          }}
          disabled={status.kind === "signing" || !creatorAddress}
          className="w-full rounded bg-accent py-4 font-ui text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-accent-bright hover:shadow-glow-lg disabled:opacity-50"
        >
          {status.kind === "signing"
            ? "Confirm in wallet…"
            : status.kind === "sent"
            ? "✓ Sent"
            : "Send Tip On-Chain →"}
        </button>
      </div>
    </div>
  );
}
