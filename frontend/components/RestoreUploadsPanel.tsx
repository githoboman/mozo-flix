"use client";

/**
 * components/RestoreUploadsPanel.tsx
 *
 * Recovery UI after a Stacks testnet reset. Reads the current browser's
 * `mozoflix:videoMeta` + `mozoflix:pendingUploads` entries, previews each
 * one, and lets the creator re-register them on the freshly-deployed
 * contract in a single batch.
 *
 * Model:
 *   - Every entry is one wallet-signed `register-and-fund` transaction.
 *   - If we still have a pinned `manifestCid` for the entry (from
 *     pendingUploads), we reuse it — no re-pin needed. Otherwise we
 *     re-pin a fresh v2 manifest from the local metadata + video CID.
 *   - New video IDs are assigned by the contract; old numeric links stay
 *     broken. That's inherent to a testnet reset — there's no way to
 *     preserve the old ids.
 *
 * Sources restored:
 *   - IPFS file uploads (videoCid present in videoMeta) ✓
 *   - YouTube/X (only if the entry is in pendingUploads with a
 *     manifestCid — the manifest already encodes the source URL) ✓
 *   - Everything else is skipped with a clear reason.
 */

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/lib/useWallet";
import { getAllVideoMeta, setVideoMeta, type VideoMetadata } from "@/lib/videoMeta";
import {
  getPendingUploads,
  addPendingUpload,
  type PendingUpload,
} from "@/lib/pendingUploads";
import { pinManifest } from "@/lib/manifest";
import { registerAndFund, stxToMicro } from "@/lib/stacks";
import { getNextVideoId } from "@/lib/stacks-reads";
import { explorerTxUrl, watchUrl } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { friendlyError } from "@/lib/errorMessage";

type Row = {
  key: string;
  source: "meta" | "pending";
  title: string;
  description: string;
  category: string;
  /** IPFS CID of the raw video file (only for file uploads). */
  videoCid?: string;
  /** IPFS CID of a previously-pinned manifest (only for pendingUploads). */
  manifestCid?: string;
  thumbnail?: string;
  /** True when we have enough info to restore this entry. */
  restorable: boolean;
  /** Reason we can't restore (only when !restorable). */
  reason?: string;
  status:
    | { kind: "idle" }
    | { kind: "pinning" }
    | { kind: "registering" }
    | { kind: "done"; newId: number; txid: string }
    | { kind: "error"; message: string };
};

export function RestoreUploadsPanel() {
  const wallet = useWallet();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reward, setReward] = useState<number>(1);
  const [pool, setPool] = useState<number>(5);
  const [running, setRunning] = useState(false);

  // Read local state once on mount. Both stores are per-browser, so we
  // filter to only what the currently-connected wallet uploaded. If the
  // creator connects a different wallet, they'll see a different list.
  useEffect(() => {
    if (!wallet.address) {
      setRows([]);
      return;
    }
    const metas = getAllVideoMeta().filter(
      (m) => m.uploaderAddress === wallet.address,
    );
    const pending = getPendingUploads(wallet.address);
    const built = buildRows(metas, pending);
    setRows(built);
    // Select everything restorable by default
    setSelected(new Set(built.filter((r) => r.restorable).map((r) => r.key)));
  }, [wallet.address]);

  const restorableCount = useMemo(
    () => rows.filter((r) => r.restorable).length,
    [rows],
  );
  const selectedCount = useMemo(() => selected.size, [selected]);

  const toggle = (key: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateStatus = (key: string, patch: Partial<Row["status"]>) => {
    setRows((cur) =>
      cur.map((r) =>
        r.key === key
          ? { ...r, status: { ...(r.status as object), ...patch } as Row["status"] }
          : r,
      ),
    );
  };

  const setStatus = (key: string, status: Row["status"]) => {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, status } : r)));
  };

  const restoreOne = async (row: Row) => {
    if (!wallet.address) throw new Error("Wallet not connected");
    // 1. Ensure we have a manifest CID. Reuse the existing one from
    //    pendingUploads when possible; otherwise pin a fresh v2 manifest
    //    that mirrors the original metadata + video source.
    let manifestCid = row.manifestCid;
    if (!manifestCid) {
      if (!row.videoCid) {
        throw new Error(
          "No video CID or manifest CID stored locally — this entry can't be restored automatically.",
        );
      }
      setStatus(row.key, { kind: "pinning" });
      const pinned = await pinManifest({
        schema: "mozoflix-video-v2",
        title: row.title,
        description: row.description,
        category: row.category,
        source: {
          type: "ipfs",
          videoCid: row.videoCid,
          videoFormat: "mp4",
        },
        thumbnailCid: undefined, // could re-pin thumb here later
        uploaderAddress: wallet.address,
        uploadedAt: Date.now(),
      });
      manifestCid = pinned.cid;
    }

    // 2. Reserve the next id and broadcast register-and-fund.
    const expectedId = await getNextVideoId();
    setStatus(row.key, { kind: "registering" });

    return await new Promise<{ newId: number; txid: string }>((resolve, reject) => {
      registerAndFund(
        `ipfs://${manifestCid}`,
        stxToMicro(reward),
        70, // completion threshold — the platform default
        stxToMicro(pool),
        wallet.address!,
        async (registerTx) => {
          // Persist the fresh mapping so browse cards show up immediately,
          // and the pending strip surfaces it until the tx confirms.
          setVideoMeta({
            id: expectedId,
            title: row.title,
            description: row.description,
            category: row.category,
            videoCid: row.videoCid,
            videoFormat: row.videoCid ? "mp4" : undefined,
            thumbnail: row.thumbnail,
            uploadedAt: Date.now(),
            uploaderAddress: wallet.address!,
          });
          addPendingUpload({
            expectedId,
            title: row.title,
            category: row.category,
            registerTx,
            manifestCid: manifestCid!,
            videoCid: row.videoCid,
            thumbnail: row.thumbnail,
            uploaderAddress: wallet.address!,
            createdAt: Date.now(),
          });
          resolve({ newId: expectedId, txid: registerTx });
        },
      ).catch(reject);
    });
  };

  const restoreAll = async () => {
    if (!wallet.address) {
      toast.show({ kind: "error", title: "Connect wallet first", body: "" });
      return;
    }
    if (selected.size === 0) return;
    setRunning(true);
    let ok = 0;
    let failed = 0;
    for (const row of rows) {
      if (!selected.has(row.key)) continue;
      try {
        const { newId, txid } = await restoreOne(row);
        setStatus(row.key, { kind: "done", newId, txid });
        ok += 1;
      } catch (e) {
        const msg = friendlyError(e);
        setStatus(row.key, { kind: "error", message: msg });
        failed += 1;
      }
      // Small gap so wallet prompts don't pile up on top of each other
      await new Promise((r) => setTimeout(r, 400));
    }
    setRunning(false);
    toast.show({
      kind: ok > 0 ? "success" : "error",
      title: `Restore complete`,
      body: `${ok} restored, ${failed} failed. Browse will update once txs confirm (~10 min).`,
      action: { label: "Open browse", href: "/browse" },
    });
  };

  if (!wallet.connected || !wallet.address) {
    return (
      <div className="rounded-2xl border border-accent-border bg-card p-8 text-center">
        <div className="mb-2 font-display text-h2">Connect your wallet</div>
        <p className="text-[13px] font-light text-muted">
          Restore reads the upload history stored in this browser for the
          connected wallet. Connect the wallet you used to publish, then
          come back to this page.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-accent-border bg-card p-10 text-center">
        <div className="mb-3 text-4xl">📼</div>
        <div className="mb-2 font-display text-h2">
          No local upload history for this wallet
        </div>
        <p className="mx-auto max-w-md text-[13px] font-light leading-relaxed text-muted">
          Restore only knows about videos you published from{" "}
          <span className="font-mono text-accent">this browser</span>. If your
          uploads were on a different device or after clearing site data,
          they can&apos;t be recovered automatically — you&apos;ll need to
          re-upload from{" "}
          <a href="/upload" className="text-accent hover:underline">
            /upload
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 font-display text-h2">
              {restorableCount} video{restorableCount === 1 ? "" : "s"} to
              restore
            </div>
            <p className="text-[12px] font-light text-muted">
              Each one is a wallet-signed <code>register-and-fund</code> tx.
              You&apos;ll be prompted per video. New ids will be assigned —
              old <span className="font-mono">/watch/N</span> links won&apos;t
              carry over.
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-ui text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
              Default reward per view (STX)
            </span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={reward}
              onChange={(e) => setReward(Number(e.target.value) || 0)}
              className="rounded border border-white/10 bg-surface px-3 py-2 font-mono text-[14px] focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-ui text-[10px] font-bold uppercase tracking-[0.15em] text-muted">
              Initial pool per video (STX)
            </span>
            <input
              type="number"
              step="1"
              min="1"
              value={pool}
              onChange={(e) => setPool(Number(e.target.value) || 0)}
              className="rounded border border-white/10 bg-surface px-3 py-2 font-mono text-[14px] focus:border-accent focus:outline-none"
            />
          </label>
        </div>

        <div className="mb-4 text-[11px] font-light text-muted">
          You&apos;ll spend approximately{" "}
          <span className="font-mono text-white">
            {(pool * selectedCount).toFixed(2)} STX
          </span>{" "}
          in pool funding across {selectedCount} video
          {selectedCount === 1 ? "" : "s"}, plus tx fees.
        </div>

        <button
          type="button"
          onClick={restoreAll}
          disabled={running || selected.size === 0}
          className="rounded bg-accent px-6 py-3 font-ui text-[12px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-accent-bright disabled:opacity-50"
        >
          {running
            ? `Restoring… ${rows.filter((r) => r.status.kind === "done").length}/${selected.size}`
            : `Restore ${selected.size} video${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <RowItem
            key={row.key}
            row={row}
            selected={selected.has(row.key)}
            onToggle={() => toggle(row.key)}
            disabled={running || !row.restorable}
          />
        ))}
      </ul>
    </div>
  );
}

function RowItem({
  row,
  selected,
  onToggle,
  disabled,
}: {
  row: Row;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const status = row.status;
  return (
    <li className="flex items-start gap-3 rounded-lg border border-white/5 bg-surface p-3">
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        disabled={disabled}
        aria-label={`Restore ${row.title}`}
        className="mt-1 h-4 w-4 shrink-0 accent-accent"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-ui text-[13px] font-semibold text-white">
            {row.title || "(Untitled)"}
          </span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 font-ui text-[9px] uppercase tracking-[0.1em] text-white/70">
            {row.category || "Uncategorized"}
          </span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 font-ui text-[9px] uppercase tracking-[0.1em] text-white/60">
            {row.source}
          </span>
        </div>
        {!row.restorable && row.reason && (
          <div className="mt-1 text-[11px] font-light text-red-300">
            ✗ {row.reason}
          </div>
        )}
        {row.restorable && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-light text-muted">
            {row.videoCid && (
              <span className="font-mono">
                video: {row.videoCid.slice(0, 12)}…
              </span>
            )}
            {row.manifestCid && (
              <span className="font-mono">
                manifest: {row.manifestCid.slice(0, 12)}…
              </span>
            )}
          </div>
        )}
        {status.kind !== "idle" && (
          <div className="mt-1 text-[11px]">
            {status.kind === "pinning" && (
              <span className="text-accent">📌 Re-pinning manifest…</span>
            )}
            {status.kind === "registering" && (
              <span className="text-accent">
                ✍️ Sign register-and-fund in your wallet…
              </span>
            )}
            {status.kind === "done" && (
              <span className="text-green-300">
                ✓ Restored as{" "}
                <a
                  href={watchUrl(status.newId, row.title)}
                  className="underline hover:text-green-200"
                >
                  #{status.newId}
                </a>{" "}
                ·{" "}
                <a
                  href={explorerTxUrl(status.txid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline hover:text-green-200"
                >
                  {status.txid.slice(0, 12)}…
                </a>
              </span>
            )}
            {status.kind === "error" && (
              <span className="text-red-300">✗ {status.message}</span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Merge local videoMeta + pendingUploads into a unified restore list,
 * deduped by content (prefer pendingUploads when both exist because it
 * carries the manifestCid).
 */
function buildRows(
  metas: VideoMetadata[],
  pending: PendingUpload[],
): Row[] {
  const byCid = new Map<string, Row>();

  for (const p of pending) {
    // Key by manifestCid — reliable unique id for a pinned manifest
    const key = `p:${p.manifestCid}`;
    byCid.set(key, {
      key,
      source: "pending",
      title: p.title,
      description: "",
      category: p.category ?? "Education",
      videoCid: p.videoCid,
      manifestCid: p.manifestCid,
      thumbnail: p.thumbnail,
      restorable: true,
      status: { kind: "idle" },
    });
  }

  for (const m of metas) {
    // Skip if we already have this content via a pendingUpload entry
    const alreadyByCid =
      m.videoCid &&
      Array.from(byCid.values()).some((r) => r.videoCid === m.videoCid);
    if (alreadyByCid) continue;

    const key = `m:${m.id}:${m.videoCid ?? "no-cid"}`;
    const restorable = !!m.videoCid;
    byCid.set(key, {
      key,
      source: "meta",
      title: m.title,
      description: m.description,
      category: m.category ?? "Education",
      videoCid: m.videoCid,
      thumbnail: m.thumbnail,
      restorable,
      reason: restorable
        ? undefined
        : "No video CID stored locally — original was likely YouTube/X and we lost the manifest CID with the reset.",
      status: { kind: "idle" },
    });
  }

  return Array.from(byCid.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}
