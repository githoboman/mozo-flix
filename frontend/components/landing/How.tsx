const STEPS = [
  {
    n: "01",
    icon: "🔗",
    title: "Connect Your Wallet",
    desc: "Link your Stacks-compatible wallet — Leather or Xverse. No email, no password. Your wallet is your identity. Setup takes under 60 seconds.",
  },
  {
    n: "02",
    icon: "▶️",
    title: "Watch Verified Content",
    desc: "Browse creator-funded video campaigns. Watch at least 70% of a video to unlock your reward. Our system verifies genuine engagement — no bots, no farming.",
  },
  {
    n: "03",
    icon: "💰",
    title: "Earn Real STX Tokens",
    desc: "Rewards are automatically distributed to your wallet via smart contract. Every earning is recorded on-chain. Withdraw anytime, with full transparency.",
  },
];

export function LandingHow() {
  return (
    <section
      id="how"
      className="border-y border-accent-border bg-surface px-6 py-24 md:px-12"
    >
      <div className="mb-4 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
        <span className="block h-0.5 w-8 bg-accent" />
        How It Works
      </div>
      <h2 className="mb-5 font-display text-[clamp(44px,5vw,72px)] leading-[0.95] tracking-[0.02em]">
        THREE STEPS TO
        <br />
        <span className="text-accent">YOUR FIRST EARN</span>
      </h2>

      <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-accent-border bg-accent-border md:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="group relative bg-card p-12 transition hover:bg-card-2"
          >
            <div className="pointer-events-none absolute right-6 top-4 font-display text-[80px] leading-none tracking-[0.05em] text-accent/[0.08] transition group-hover:text-accent/[0.14]">
              {s.n}
            </div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-accent/25 bg-accent-dim text-2xl">
              {s.icon}
            </div>
            <div className="mb-3 font-ui text-[20px] font-bold">{s.title}</div>
            <p className="text-[14px] font-light leading-[1.7] text-muted">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
