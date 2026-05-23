"use client";

import { useState } from "react";

const SOCIALS = [
  { name: "Twitter", icon: "🐦" },
  { name: "Discord", icon: "💬" },
  { name: "Telegram", icon: "✈️" },
  { name: "Email", icon: "✉️" },
];

export function ShareModal({
  open,
  onClose,
  url = "https://mozoflix.io/watch/1",
}: {
  open: boolean;
  onClose: () => void;
  url?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

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
        <div className="mb-6 font-display text-[28px] leading-none">SHARE</div>

        <div className="mb-6 grid grid-cols-4 gap-3">
          {SOCIALS.map((s) => (
            <button
              key={s.name}
              className="flex flex-col items-center gap-2 rounded-lg border border-white/10 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent hover:bg-card-2"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="font-ui text-[10px] uppercase tracking-[0.1em] text-muted">
                {s.name}
              </span>
            </button>
          ))}
        </div>

        <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
          Share Link
        </div>
        <div className="mb-4 flex overflow-hidden rounded-lg border border-white/10 bg-surface">
          <input
            value={url}
            readOnly
            className="flex-1 bg-transparent px-4 py-3 text-[12px] text-white focus:outline-none"
          />
          <button
            onClick={copy}
            className="bg-accent px-5 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-black hover:bg-accent-bright"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
          Embed
        </div>
        <textarea
          readOnly
          rows={2}
          value={`<iframe src="${url}/embed" width="640" height="360" frameborder="0" allowfullscreen></iframe>`}
          className="w-full resize-none rounded-lg border border-white/10 bg-surface p-3 font-mono text-[11px] text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}
