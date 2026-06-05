const FEATURES = [
  {
    icon: "auto_awesome",
    title: "AI Upload Assistant",
    desc: "Drop a video file and our assistant writes the title, description, category, and tags — tuned for discoverability on a Web3 audience. Powered by Claude.",
  },
  {
    icon: "insights",
    title: "AI Reward Optimizer",
    desc: "We analyze network-wide reward rates, your category, and viewer signals to recommend a STX-per-view that hits the sweet spot between cost and conversion.",
  },
  {
    icon: "image",
    title: "Smart Thumbnails",
    desc: "Auto-extracts a clean preview frame from your video so you don't need a designer to ship. Override with a custom upload anytime.",
  },
];

export function LandingAI() {
  return (
    <section
      id="ai"
      className="relative overflow-hidden px-6 py-24 md:px-12"
    >
      {/* subtle accent wash, mirrors Hero's vibe without competing with it */}
      <div className="pointer-events-none absolute -left-32 top-12 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,107,0,0.08)_0%,transparent_70%)]" />

      <div className="relative">
        <div className="mb-4 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          AI · Built-in
        </div>
        <h2 className="mb-5 font-display text-[clamp(44px,5vw,72px)] leading-[0.95] tracking-[0.02em]">
          AI DOES THE
          <br />
          <span className="text-accent">BORING PARTS</span>
        </h2>
        <p className="max-w-[640px] text-[15px] font-light leading-[1.7] text-muted">
          We blend on-chain primitives with on-device AI so creators ship
          faster and viewers find content that matches them — no farms, no
          black-box recommendations.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-accent-border bg-accent-border md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative bg-card p-12 transition hover:bg-card-2"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-accent/25 bg-accent-dim text-accent">
                <span className="material-symbols-outlined text-[26px]">
                  {f.icon}
                </span>
              </div>
              <div className="mb-3 font-ui text-[20px] font-bold">
                {f.title}
              </div>
              <p className="text-[14px] font-light leading-[1.7] text-muted">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 font-ui text-[11px] uppercase tracking-[0.15em] text-muted">
          <span className="rounded-full border border-accent/25 bg-accent-dim px-3 py-1 text-accent">
            Claude · Anthropic
          </span>
          <span>·</span>
          <span>Runs server-side, never sees your wallet keys</span>
        </div>
      </div>
    </section>
  );
}
