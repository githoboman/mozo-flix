"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/useWallet";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  getReferrer,
  getReferralPending,
} from "@/lib/stacks-reads";
import {
  registerReferral,
  claimReferralBonus,
  microToStx,
} from "@/lib/stacks";

export default function ReferralsPage() {
  return (
    <Suspense fallback={<ReferralsFallback />}>
      <ReferralsInner />
    </Suspense>
  );
}

function ReferralsFallback() {
  return (
    <>
      <main className="mx-auto max-w-[800px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[100px]">
        <div className="text-muted">Loading…</div>
      </main>
    </>
  );
}

function ReferralsInner() {
  const wallet = useWallet();
  const params = useSearchParams();
  const refFromUrl = params.get("ref");

  const [currentReferrer, setCurrentReferrer] = useState<string | null>(null);
  const [pending, setPending] = useState<bigint>(0n);
  const [referrerInput, setReferrerInput] = useState(refFromUrl ?? "");
  const [busy, setBusy] = useState<"register" | "claim" | null>(null);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok"; txid: string }
    | { kind: "err"; message: string }
  >({ kind: "idle" });

  const refresh = async () => {
    if (!wallet.address) return;
    const [r, p] = await Promise.all([
      getReferrer(wallet.address),
      getReferralPending(wallet.address),
    ]);
    setCurrentReferrer(r);
    setPending(p);
  };

  useEffect(() => {
    refresh();
  }, [wallet.address]);

  const inviteLink =
    typeof window !== "undefined" && wallet.address
      ? `${window.location.origin}/referrals?ref=${wallet.address}`
      : "";

  const onRegister = async () => {
    if (!referrerInput.match(/^ST|^SP/)) {
      setStatus({ kind: "err", message: "Invalid referrer address." });
      return;
    }
    if (wallet.address && referrerInput === wallet.address) {
      setStatus({ kind: "err", message: "You can't refer yourself." });
      return;
    }
    setBusy("register");
    try {
      await registerReferral(referrerInput, (txid) => {
        setStatus({ kind: "ok", txid });
        setBusy(null);
        setTimeout(refresh, 8000);
      });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
      setBusy(null);
    }
  };

  const onClaim = async () => {
    setBusy("claim");
    try {
      await claimReferralBonus((txid) => {
        setStatus({ kind: "ok", txid });
        setBusy(null);
        setTimeout(refresh, 8000);
      });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
      setBusy(null);
    }
  };

  return (
    <>
      <main className="mx-auto max-w-[800px] px-6 pb-24 pt-[100px] md:px-12">
        <div className="mb-2 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          Earn Together
        </div>
        <h1 className="mb-10 font-display text-[clamp(48px,5vw,80px)] uppercase leading-[0.95]">
          Referrals
        </h1>

        {!wallet.connected ? (
          <div className="rounded-2xl border border-accent-border bg-card p-10 text-center">
            <h2 className="mb-2 font-display text-h2">Connect your wallet</h2>
            <p className="text-[14px] text-muted">
              Referrals are tied to your wallet address.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {status.kind === "ok" && (
              <div className="rounded border border-green-500/40 bg-green-500/10 p-3 text-[12px] text-green-300">
                ✓ Tx broadcast:{" "}
                <a
                  href={`https://explorer.hiro.so/txid/${status.txid}?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all font-mono underline"
                >
                  {status.txid.slice(0, 14)}…
                </a>
              </div>
            )}
            {status.kind === "err" && (
              <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-300">
                {status.message}
              </div>
            )}

            {/* Section 1: You as a referee */}
            <div className="rounded-2xl border border-accent-border bg-card p-6">
              <h2 className="mb-2 font-display text-h2">
                Got invited?
              </h2>
              {currentReferrer ? (
                <div>
                  <p className="text-[14px] text-muted">
                    You&apos;re already referred by:
                  </p>
                  <p className="mt-1 font-mono text-[13px] text-accent">
                    {currentReferrer}
                  </p>
                  <p className="mt-3 text-[11px] text-muted/70">
                    Once-per-wallet link, immutable. They earn 10% of your
                    watch rewards for the first ~30 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[14px] text-muted">
                    Enter the wallet address of whoever invited you.
                    {refFromUrl &&
                      " (Auto-filled from your invite link.)"}
                  </p>
                  <input
                    value={referrerInput}
                    onChange={(e) => setReferrerInput(e.target.value)}
                    placeholder="ST..."
                    className="w-full rounded border border-white/10 bg-surface px-4 py-3 font-mono text-[13px] focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={onRegister}
                    disabled={busy !== null}
                    className="rounded bg-accent px-5 py-2.5 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-accent-bright disabled:opacity-50"
                  >
                    {busy === "register"
                      ? "Confirm in wallet…"
                      : "Link Referral →"}
                  </button>
                </div>
              )}
            </div>

            {/* Section 2: You as a referrer */}
            <div className="rounded-2xl border border-accent-border bg-card p-6">
              <h2 className="mb-2 font-display text-h2">Invite others</h2>
              <p className="mb-3 text-[14px] text-muted">
                Share your invite link. You earn 10% of every reward your
                referees receive in their first 30 days.
              </p>
              <div className="mb-3 flex overflow-hidden rounded border border-white/10 bg-surface">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-transparent px-4 py-3 font-mono text-[12px] focus:outline-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="bg-accent px-5 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-black hover:bg-accent-bright"
                >
                  Copy
                </button>
              </div>

              <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/5 pt-6">
                <div>
                  <div className="font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
                    Pending bonus
                  </div>
                  <div className="font-display text-[36px] leading-none">
                    {microToStx(pending)}
                    <span className="ml-2 font-ui text-[14px] tracking-[0.1em] text-muted">
                      STX
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClaim}
                  disabled={pending === 0n || busy !== null}
                  className="rounded bg-accent px-5 py-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-accent-bright disabled:opacity-40"
                >
                  {busy === "claim" ? "Confirm…" : "Claim Bonus"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
