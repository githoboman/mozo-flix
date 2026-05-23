"use client";

import { useState } from "react";

const FEATURES = [
  {
    name: "Verified Watch Engine",
    desc: "Tracks watch time, completion percentage, and active engagement signals to ensure rewards go to real viewers only.",
  },
  {
    name: "Smart Contract Rewards",
    desc: "Clarity contracts on Stacks handle all reward distribution automatically. Fully auditable, transparent, and trustless by design.",
  },
  {
    name: "Earnings Dashboard",
    desc: "Track all earnings, view completed videos, monitor reward history, and withdraw STX directly from your personal dashboard.",
  },
  {
    name: "Creator Campaigns",
    desc: "Creators fund reward pools in STX, set engagement thresholds, and receive detailed on-chain analytics on every view.",
  },
];

export function LandingFeatures() {
  const [active, setActive] = useState(0);

  return (
    <section id="features" className="bg-bg px-6 py-24 md:px-12">
      <div className="mb-4 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
        <span className="block h-0.5 w-8 bg-accent" />
        Platform Features
      </div>
      <h2 className="mb-5 font-display text-[clamp(44px,5vw,72px)] leading-[0.95] tracking-[0.02em]">
        EVERYTHING YOU
        <br />
        <span className="text-accent">NEED TO EARN</span>
      </h2>

      <div className="mt-16 grid items-center gap-20 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          {FEATURES.map((f, i) => {
            const isActive = i === active;
            return (
              <button
                key={f.name}
                onClick={() => setActive(i)}
                className={`flex gap-5 rounded-xl border p-6 text-left transition ${
                  isActive
                    ? "border-accent-border bg-card"
                    : "border-transparent hover:border-accent-border hover:bg-card"
                }`}
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full transition ${
                    isActive
                      ? "bg-accent shadow-glow"
                      : "bg-accent/30"
                  }`}
                />
                <div>
                  <div className="mb-1.5 font-ui text-[16px] font-bold">
                    {f.name}
                  </div>
                  <div className="text-[13px] font-light leading-[1.6] text-muted">
                    {f.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-2xl border border-accent-border bg-card p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,107,0,0.08)_0%,transparent_70%)]" />
          <div>
            <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.1em] text-muted">
              Watch Progress
            </div>
            <div className="mb-5 h-1.5 overflow-hidden rounded-sm bg-white/[0.06]">
              <div
                className="h-full rounded-sm bg-gradient-to-r from-accent to-accent-bright transition-all duration-700"
                style={{ width: "74%" }}
              />
            </div>
            <div className="font-ui text-[11px] uppercase tracking-[0.1em] text-muted">
              Reward Unlocked at 70% ✓
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { icon: "✅", text: "Watch event recorded on-chain", amt: "+0.5 STX" },
              { icon: "🔗", text: "Smart contract triggered", amt: "confirmed" },
              { icon: "💸", text: "Reward sent to SP2A…F4X", amt: "+0.5 STX" },
            ].map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 text-[12px]"
              >
                <span className="text-base">{e.icon}</span>
                <span className="flex-1 font-light text-muted">{e.text}</span>
                <span className="font-ui font-bold text-accent">{e.amt}</span>
              </div>
            ))}
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-accent/20 bg-accent-dim px-3.5 py-2 font-ui text-[11px] font-semibold tracking-[0.05em] text-accent">
            ⛓ Verified on Stacks Blockchain · Block #142,887
          </div>
        </div>
      </div>
    </section>
  );
}
