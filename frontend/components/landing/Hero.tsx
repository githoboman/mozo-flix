"use client";

import { useEffect, useState } from "react";
import { WalletModal } from "../WalletModal";
import { getLandingStats, type LandingStats } from "@/lib/landingStats";
import { CountUp } from "@/components/CountUp";

export function LandingHero() {
  const [walletOpen, setWalletOpen] = useState(false);
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    getLandingStats().then(setStats);
  }, []);

  return (
    <>
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 pb-16 pt-[100px] sm:px-6 md:px-12 md:pb-20 md:pt-[120px] grid-bg">
        {/* Glows */}
        <div className="pointer-events-none absolute -right-52 -top-52 h-[900px] w-[900px] animate-pulse-glow rounded-full bg-[radial-gradient(circle,rgba(255,107,0,0.12)_0%,transparent_65%)]" />
        <div
          className="pointer-events-none absolute bottom-0 left-24 h-[500px] w-[500px] animate-pulse-glow rounded-full bg-[radial-gradient(circle,rgba(255,107,0,0.07)_0%,transparent_70%)]"
          style={{ animationDelay: "3s" }}
        />

        <div className="relative z-[2] max-w-[680px]">
          <div className="mb-8 inline-flex animate-fade-up items-center gap-2 rounded-full border border-accent-border bg-accent-dim px-4 py-1.5 font-ui text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" />
            Built on Stacks · Bitcoin-Secured
          </div>

          <h1 className="mb-7 animate-fade-up font-display leading-[0.92] tracking-[0.02em] text-[clamp(48px,9vw,140px)]">
            WATCH. <span className="text-accent">EARN.</span> OWN.
          </h1>

          <p
            className="mb-12 max-w-[520px] animate-fade-up text-[17px] font-light leading-[1.7] text-muted"
            style={{ animationDelay: "0.2s" }}
          >
            The first decentralised watch-to-earn video platform on Stacks.
            Your attention has value — it&apos;s time you got paid for it.
          </p>

          <div
            className="flex animate-fade-up flex-wrap items-center gap-4"
            style={{ animationDelay: "0.3s" }}
          >
            <button
              type="button"
              onClick={() => setWalletOpen(true)}
              className="group flex items-center gap-2.5 rounded bg-accent px-9 py-4 font-ui text-[14px] font-bold uppercase tracking-[0.08em] text-black transition hover:-translate-y-0.5 hover:bg-accent-bright hover:shadow-glow-lg"
            >
              Start Earning
              <span className="transition group-hover:translate-x-1">→</span>
            </button>
            <a
              href="#how"
              className="rounded border border-white/20 px-8 py-[15px] font-ui text-[14px] font-semibold uppercase tracking-[0.08em] text-white transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
            >
              See How It Works
            </a>
          </div>

          <div
            className="mt-12 flex animate-fade-up flex-wrap gap-6 border-t border-accent-border pt-8 md:mt-16 md:gap-12 md:pt-12"
            style={{ animationDelay: "0.4s" }}
          >
            {[
              {
                num: stats?.totalVideos ?? 0,
                suffix: "",
                label: "Videos On-Chain",
              },
              {
                num: stats?.uniqueCreators ?? 0,
                suffix: "",
                label: "Creators",
              },
              {
                num: stats?.totalDistributed ?? "0",
                suffix: " STX",
                label: "Rewards Distributed",
              },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1">
                <div className="font-display text-[32px] leading-none tracking-[0.03em] md:text-[42px]">
                  <CountUp value={s.num} />
                  <span className="text-accent">{s.suffix}</span>
                </div>
                <div className="font-ui text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
}
