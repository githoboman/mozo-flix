"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/useWallet";
import { useToast } from "@/components/Toast";
import { setVideoActive } from "@/lib/stacks";
import { watchUrl, explorerTxUrl } from "@/lib/format";

type ReportRow = {
  videoId: number;
  reports: Array<{
    videoId: number;
    reporterAddress: string;
    reason: string;
    detail?: string;
    createdAt: number;
  }>;
};

type ActionRow = {
  videoId: number;
  action: string;
  adminAddress: string;
  reason?: string;
  createdAt: number;
};

/**
 * Admin-only dashboard for reviewing reports, hiding videos from surfaces,
 * deactivating them on-chain, and flagging creator wallets.
 *
 * Access gating is checked twice:
 *   1. Client-side we compare wallet.address to NEXT_PUBLIC_CONTRACT_ADDRESS
 *      (deployer = initial owner). Bypassable but keeps honest users out.
 *   2. Server-side, /api/moderation/action re-checks ADMIN_ADDRESSES env var.
 *      That's the real gate.
 */
export default function ModerationPage() {
  const wallet = useWallet();
  const toast = useToast();
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [hidden, setHidden] = useState<number[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const adminAddress =
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
    "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";
  const isAdmin = wallet.address === adminAddress;

  const refresh = async () => {
    try {
      const res = await fetch("/api/moderation/list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setRows(data.reports as ReportRow[]);
      setHidden(data.hidden as number[]);
      setActions(data.actions as ActionRow[]);
    } catch (e) {
      toast.show({
        kind: "error",
        title: "Couldn't load reports",
        body: (e as Error).message,
      });
      setRows([]);
    }
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  const runAction = async (
    videoId: number,
    action: "hide" | "unhide" | "flag-creator",
    creatorAddress?: string,
  ) => {
    if (!wallet.address) return;
    setBusy(`${videoId}:${action}`);
    try {
      const res = await fetch("/api/moderation/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          action,
          adminAddress: wallet.address,
          creatorAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      toast.show({
        kind: "success",
        title:
          action === "hide"
            ? "Video hidden"
            : action === "unhide"
            ? "Video unhidden"
            : "Creator flagged",
      });
      await refresh();
    } catch (e) {
      toast.show({
        kind: "error",
        title: "Action failed",
        body: (e as Error).message,
      });
    } finally {
      setBusy(null);
    }
  };

  const deactivateOnChain = async (videoId: number) => {
    setBusy(`${videoId}:deactivate`);
    try {
      await setVideoActive(videoId, false, (txId) => {
        toast.show({
          kind: "success",
          title: "On-chain deactivation submitted",
          body: `Video #${videoId} is being deactivated on Stacks. Rewards stop immediately once confirmed.`,
          action: { label: "View tx", href: explorerTxUrl(txId) },
        });
      });
    } catch (e) {
      toast.show({
        kind: "error",
        title: "Deactivate failed",
        body: (e as Error).message,
      });
    } finally {
      setBusy(null);
    }
  };

  if (wallet.loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-[100px]">
        <div className="text-muted">Checking wallet…</div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 pb-24 pt-[120px] text-center">
        <span className="material-symbols-outlined mb-3 text-5xl text-accent">
          shield_lock
        </span>
        <h1 className="mb-2 font-display text-h2 uppercase tracking-wide">
          Admin only
        </h1>
        <p className="mb-4 text-[13px] font-light text-muted">
          This moderation dashboard is gated to the mozoflix-admin owner
          wallet.
          {wallet.address ? (
            <>
              <br />
              Connected as{" "}
              <span className="font-mono text-white">
                {wallet.address.slice(0, 8)}…
              </span>
              .
            </>
          ) : (
            " Connect the admin wallet to continue."
          )}
        </p>
        <Link
          href="/studio"
          className="rounded border border-white/15 px-4 py-2 font-ui text-[11px] uppercase tracking-[0.1em] text-white hover:border-accent hover:text-accent"
        >
          Back to Studio
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-[100px] sm:px-6 md:px-10">
      <div className="mb-1 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
        <span className="block h-0.5 w-8 bg-accent" />
        Admin · Moderation
      </div>
      <h1 className="mb-8 font-display text-[clamp(36px,4vw,56px)] leading-[0.95]">
        REPORTED <span className="text-accent">VIDEOS</span>
      </h1>

      {rows === null ? (
        <div className="text-muted">Loading reports…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-accent-border bg-card p-12 text-center">
          <div className="mb-3 text-4xl">🕊️</div>
          <h2 className="mb-2 font-display text-h2">No reports</h2>
          <p className="text-[13px] font-light text-muted">
            Nothing to review right now. This page will populate as viewers
            report videos.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ videoId, reports }) => {
            const isHidden = hidden.includes(videoId);
            const reasonCounts = reports.reduce<Record<string, number>>(
              (acc, r) => {
                acc[r.reason] = (acc[r.reason] ?? 0) + 1;
                return acc;
              },
              {},
            );
            return (
              <div
                key={videoId}
                className={`rounded-xl border p-5 ${
                  isHidden
                    ? "border-red-500/40 bg-red-500/5"
                    : "border-accent-border bg-card"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <Link
                    href={watchUrl(videoId)}
                    className="font-ui text-[14px] font-bold hover:text-accent"
                  >
                    Video #{videoId}
                  </Link>
                  <span className="rounded bg-accent-dim px-2 py-0.5 font-ui text-[10px] uppercase tracking-[0.1em] text-accent">
                    {reports.length} report
                    {reports.length === 1 ? "" : "s"}
                  </span>
                  {isHidden && (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 font-ui text-[10px] uppercase tracking-[0.1em] text-red-300">
                      Hidden
                    </span>
                  )}
                  {Object.entries(reasonCounts).map(([reason, n]) => (
                    <span
                      key={reason}
                      className="rounded border border-white/10 px-2 py-0.5 font-ui text-[10px] uppercase tracking-[0.1em] text-muted"
                    >
                      {reason} · {n}
                    </span>
                  ))}
                </div>

                <details className="mb-3">
                  <summary className="cursor-pointer text-[12px] text-muted hover:text-white">
                    Show individual reports
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    {reports.map((r, i) => (
                      <div
                        key={i}
                        className="rounded border border-white/5 bg-surface p-2 text-[11px]"
                      >
                        <div className="flex flex-wrap gap-2 text-muted">
                          <span className="rounded bg-accent-dim px-1.5 text-accent">
                            {r.reason}
                          </span>
                          <span className="font-mono">
                            {r.reporterAddress.slice(0, 8)}…
                          </span>
                          <span>
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {r.detail && (
                          <div className="mt-1 text-white/80">{r.detail}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>

                <div className="flex flex-wrap gap-2">
                  {isHidden ? (
                    <button
                      type="button"
                      disabled={busy != null}
                      onClick={() => runAction(videoId, "unhide")}
                      className="rounded border border-accent px-3 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-accent transition hover:bg-accent hover:text-black disabled:opacity-50"
                    >
                      Unhide
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy != null}
                      onClick={() => runAction(videoId, "hide")}
                      className="rounded bg-accent px-3 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-accent-bright disabled:opacity-50"
                    >
                      Hide from platform
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy != null}
                    onClick={() => deactivateOnChain(videoId)}
                    className="rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-red-300 transition hover:border-red-500 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Deactivate on-chain
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {actions.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-3 font-display text-xl uppercase tracking-wide">
            Recent actions
          </h2>
          <div className="rounded-xl border border-accent-border bg-card p-4">
            <div className="flex flex-col gap-1">
              {actions.slice(0, 15).map((a, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 border-b border-white/5 py-1.5 text-[11px] text-muted last:border-b-0"
                >
                  <span
                    className={`rounded px-1.5 font-ui uppercase ${
                      a.action === "hide"
                        ? "bg-red-500/20 text-red-300"
                        : a.action === "unhide"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-accent-dim text-accent"
                    }`}
                  >
                    {a.action}
                  </span>
                  <Link
                    href={watchUrl(a.videoId)}
                    className="text-white hover:text-accent"
                  >
                    #{a.videoId}
                  </Link>
                  <span className="font-mono">
                    by {a.adminAddress.slice(0, 8)}…
                  </span>
                  <span>{new Date(a.createdAt).toLocaleString()}</span>
                  {a.reason && <span>· {a.reason}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
