"use client";

import { useState } from "react";
import { WalletModal } from "../WalletModal";

export function LandingCTA() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="relative overflow-hidden bg-bg px-6 py-32 text-center md:px-12">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(255,107,0,0.08)_0%,transparent_60%)]" />
        <div className="mb-4 flex items-center justify-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          Ready to Earn
        </div>
        <h2 className="mb-5 font-display text-[clamp(60px,7vw,110px)] leading-[0.95] tracking-[0.02em]">
          YOUR ATTENTION
          <br />
          HAS <span className="text-accent">VALUE.</span>
        </h2>
        <p className="mx-auto mb-12 max-w-[520px] text-[16px] font-light leading-[1.75] text-muted">
          Join thousands of early users already earning STX by watching content
          they love. Be part of the watch-to-earn revolution.
        </p>
        <div className="relative z-10 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setOpen(true)}
            className="group flex items-center gap-2.5 rounded bg-accent px-9 py-4 font-ui text-[14px] font-bold uppercase tracking-[0.08em] text-black transition hover:-translate-y-0.5 hover:bg-accent-bright hover:shadow-glow-lg"
          >
            Connect Wallet &amp; Start
            <span className="transition group-hover:translate-x-1">→</span>
          </button>
          <a
            href="/README MOZOflix .pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-white/20 px-8 py-[15px] font-ui text-[14px] font-semibold uppercase tracking-[0.08em] text-white transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
          >
            Read the Whitepaper
          </a>
        </div>
      </section>
      <WalletModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
