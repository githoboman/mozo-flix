const CARDS = [
  { icon: "👁", title: "Watch & Earn", desc: "Watch creator-funded videos and earn STX tokens automatically when you hit the 70% completion threshold. No manual claiming required.", tag: "Live on MVP" },
  { icon: "🏆", title: "Engagement Streaks", desc: "Maintain daily viewing streaks to unlock bonus multipliers. The more consistently you engage, the higher your reward rate becomes.", tag: "Coming Soon" },
  { icon: "🤝", title: "Referral Rewards", desc: "Invite other viewers and creators to the platform. Earn a percentage of your referrals' first 30 days of watch rewards automatically.", tag: "Coming Soon" },
  { icon: "🎯", title: "Campaign Challenges", desc: "Complete curated viewing challenges — watch a series, complete a course, or attend a live session — for bonus STX rewards.", tag: "Coming Soon" },
  { icon: "🔒", title: "Premium Access", desc: "Stake STX to unlock premium content channels and exclusive creator content. Staked tokens earn yield while granting enhanced access.", tag: "Roadmap" },
  { icon: "🗳", title: "DAO Governance", desc: "Token holders vote on platform policies, content standards, fee structures, and feature priorities. Own your share of the protocol.", tag: "Roadmap" },
];

export function LandingEarn() {
  return (
    <section id="earn" className="bg-bg px-6 py-24 md:px-12">
      <div className="mb-4 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
        <span className="block h-0.5 w-8 bg-accent" />
        Earn Model
      </div>
      <h2 className="mb-5 font-display text-[clamp(44px,5vw,72px)] leading-[0.95] tracking-[0.02em]">
        MULTIPLE WAYS
        <br />
        <span className="text-accent">TO STACK STX</span>
      </h2>

      <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <div
            key={c.title}
            className="card-reveal group relative overflow-hidden rounded-2xl border border-accent-border bg-card p-9 transition hover:border-accent/25"
          >
            <div className="mb-5 text-3xl">{c.icon}</div>
            <div className="mb-2.5 font-ui text-[18px] font-bold">{c.title}</div>
            <div className="text-[13px] font-light leading-[1.7] text-muted">
              {c.desc}
            </div>
            <div className="mt-4 inline-block rounded bg-accent-dim px-2.5 py-1 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
              {c.tag}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
