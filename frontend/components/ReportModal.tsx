"use client";

import { useState } from "react";
import { useWallet } from "@/lib/useWallet";
import { useToast } from "./Toast";

const REASONS = [
  { id: "nudity", label: "Nudity / sexual content" },
  { id: "violence", label: "Graphic violence or gore" },
  { id: "hate", label: "Hate speech or hate symbols" },
  { id: "harassment", label: "Harassment / targeted abuse" },
  { id: "spam", label: "Spam or misleading content" },
  { id: "copyright", label: "Copyright infringement" },
  { id: "other", label: "Other" },
] as const;

/**
 * Modal invoked from the watch page's Report button. Sends the report to
 * /api/report-video which increments the reporter set for this video and
 * auto-hides at the threshold. The viewer's wallet signs nothing — reports
 * are a platform-level signal, not an on-chain action.
 */
export function ReportModal({
  open,
  onClose,
  videoId,
  videoTitle,
}: {
  open: boolean;
  onClose: () => void;
  videoId: number;
  videoTitle?: string;
}) {
  const wallet = useWallet();
  const toast = useToast();
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!wallet.address) {
      toast.show({
        kind: "error",
        title: "Connect wallet",
        body: "Reports are tied to your wallet so we can prevent abuse.",
      });
      return;
    }
    if (!reason) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          reporterAddress: wallet.address,
          reason,
          detail: detail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      toast.show({
        kind: "success",
        title: data.accepted ? "Report submitted" : "You've already reported this",
        body: data.autoHidden
          ? "This video has been hidden pending admin review — thank you."
          : `${data.uniqueReporters} unique report${
              data.uniqueReporters === 1 ? "" : "s"
            } on this video.`,
      });
      setReason("");
      setDetail("");
      onClose();
    } catch (e) {
      toast.show({
        kind: "error",
        title: "Report failed",
        body: (e as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="animate-scale-in relative max-h-[90vh] w-[460px] max-w-[92vw] overflow-y-auto rounded-2xl border border-accent/25 bg-card p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-muted hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.2em] text-accent">
          Report content
        </div>
        <div className="mb-2 font-display text-[26px] leading-none">
          Something wrong with this video?
        </div>
        <p className="mb-6 text-[13px] font-light text-muted">
          {videoTitle ? (
            <>
              Reporting <span className="text-white">{videoTitle}</span>.{" "}
            </>
          ) : null}
          Reports are tied to your wallet. Three unique reporters auto-hide the video
          pending admin review.
        </p>

        <div className="mb-4 flex flex-col gap-1.5">
          {REASONS.map((r) => (
            <label
              key={r.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-[13px] transition ${
                reason === r.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 bg-surface text-white hover:border-white/30"
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={r.id}
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
                className="accent-accent"
              />
              {r.label}
            </label>
          ))}
        </div>

        <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
          Additional context (optional)
        </div>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="What did you see that violates policy?"
          className="mb-5 w-full resize-none rounded border border-white/10 bg-surface p-3 text-[13px] text-white placeholder-muted focus:border-accent focus:outline-none"
        />
        <div className="mb-2 text-right text-[10px] text-muted">
          {detail.length}/500
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/10 px-4 py-2 font-ui text-[11px] uppercase tracking-[0.1em] text-muted hover:border-white/30 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason || submitting || !wallet.connected}
            className="rounded bg-accent px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-black transition hover:bg-accent-bright disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}
