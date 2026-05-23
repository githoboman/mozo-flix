const LOGOS = [
  { icon: "🟠", name: "Bitcoin" },
  { icon: "⬡", name: "Stacks" },
  { icon: "📜", name: "Clarity" },
  { icon: "🌐", name: "IPFS" },
];

const FEATS = [
  { icon: "🔐", title: "Bitcoin-Secured", desc: "All transactions settle to Bitcoin finality through Stacks' Proof of Transfer consensus mechanism." },
  { icon: "📋", title: "Clarity Smart Contracts", desc: "Decidable, auditable contracts that execute exactly as written — no surprises, no rug pulls." },
  { icon: "👛", title: "Wallet-Native Auth", desc: "No accounts, no passwords. Your Stacks wallet is your identity, session, and reward destination." },
];

export function LandingStacks() {
  return (
    <section
      id="stacks"
      className="border-y border-accent-border bg-surface px-6 py-24 text-center md:px-12"
    >
      <div className="mx-auto max-w-[720px]">
        <div className="mb-4 flex items-center justify-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          Infrastructure
        </div>
        <h2 className="mb-5 font-display text-[clamp(44px,5vw,72px)] leading-[0.95] tracking-[0.02em]">
          POWERED BY
          <br />
          <span className="text-accent">STACKS &amp; BITCOIN</span>
        </h2>
        <p className="mx-auto text-center text-[16px] font-light leading-[1.75] text-muted">
          MOZOflix is built on the Stacks blockchain — bringing smart contract
          programmability to Bitcoin. Every reward distribution is secured by
          the most battle-tested blockchain in history.
        </p>
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-center gap-12">
        {LOGOS.map((l, i) => (
          <div key={l.name} className="flex items-center gap-12">
            <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-accent-border bg-card px-9 py-7 transition hover:-translate-y-1 hover:border-accent/30">
              <div className="text-4xl">{l.icon}</div>
              <div className="font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
                {l.name}
              </div>
            </div>
            {i < LOGOS.length - 1 && (
              <div className="font-display text-[32px] text-accent/30">+</div>
            )}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 grid max-w-[900px] grid-cols-1 gap-5 md:grid-cols-3">
        {FEATS.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-accent-border bg-card p-6 text-left"
          >
            <div className="mb-3 text-xl">{f.icon}</div>
            <div className="mb-2 font-ui text-[14px] font-bold">{f.title}</div>
            <div className="text-[12px] font-light leading-[1.6] text-muted">
              {f.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
