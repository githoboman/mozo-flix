const FEATURES = [
  {
    icon: "auto_awesome",
    title: "Upload Assistant",
    desc: "Drop a video and Claude Haiku writes the title, description, category, and search tags — tuned for a Web3 audience so you don't sit staring at an empty form.",
    proof: "Fills 4 metadata fields · ~2s",
  },
  {
    icon: "insights",
    title: "Reward Optimizer",
    desc: "Reads the network-wide median reward-per-view, your category's spread, and current pool sizes to suggest a rate that clears the median without overspending.",
    proof: "Heuristic, not a black box",
  },
  {
    icon: "shield_person",
    title: "Content Safety",
    desc: "Every file upload has 5 frames auto-classified for nudity, gore, violence, drugs, and hate symbols. Anything flagged is rejected before pinning or on-chain broadcast.",
    proof: "Zero moderator queue backlog",
  },
  {
    icon: "image",
    title: "Smart Thumbnails",
    desc: "Auto-extracts a clean 16:9 preview frame from your video so you don't need a designer to ship. Override with a custom upload anytime.",
    proof: "Canvas-side, no upload needed",
  },
];

export function LandingAI() {
  return (
    <section
      id="ai"
      aria-labelledby="ai-heading"
      className="relative overflow-hidden px-6 py-16 md:px-12 md:py-24"
    >
      {/* Subtle accent wash — matches the Hero radial glow but muted so
          it reads as a section marker, not a competing focal point. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-12 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,107,0,0.08)_0%,transparent_70%)]"
      />

      <div className="relative">
        <div className="mb-3 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-6 bg-accent" aria-hidden />
          AI · Built-in
        </div>
        <h2
          id="ai-heading"
          className="mb-5 font-display text-[clamp(36px,5vw,64px)] leading-[1.02] tracking-[0.01em]"
        >
          AI does the
          <br />
          <span className="text-accent">boring parts.</span>
        </h2>
        <p className="max-w-[62ch] text-[16px] font-light leading-[1.7] text-muted">
          Four AI touchpoints, each doing one job well: fewer blank upload
          forms, sharper reward pricing, faster content-safety decisions,
          and thumbnails that don&apos;t need a designer.
        </p>

        <ul
          role="list"
          className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-accent-border bg-accent-border sm:grid-cols-2"
        >
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="group relative flex flex-col bg-card p-8 transition-colors hover:bg-card-2"
            >
              <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent-dim text-accent">
                <span
                  aria-hidden
                  className="material-symbols-outlined text-[24px]"
                >
                  {f.icon}
                </span>
              </div>
              <h3 className="mb-2 font-ui text-[18px] font-bold leading-[1.25] text-white">
                {f.title}
              </h3>
              <p className="mb-4 flex-1 text-[14px] font-light leading-[1.7] text-muted">
                {f.desc}
              </p>
              <div className="mt-auto font-ui text-[10px] font-semibold uppercase tracking-[0.12em] text-accent/70">
                {f.proof}
              </div>
            </li>
          ))}
        </ul>

        {/* Provenance strip. Meaningful for grant reviewers and technical
            visitors — signals we're using a first-party API, not a
            reseller, and that inference is server-side (so no wallet
            keys ever pass through it). */}
        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]">
          <a
            href="https://www.anthropic.com/claude"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-dim px-3 py-1.5 font-ui font-bold uppercase tracking-[0.12em] text-accent transition-colors hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <span
              aria-hidden
              className="material-symbols-outlined text-[14px]"
            >
              open_in_new
            </span>
            Powered by Claude · Anthropic
          </a>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <span className="font-ui font-light uppercase tracking-[0.12em] text-muted">
            Server-side inference — never sees your wallet keys
          </span>
        </div>
      </div>
    </section>
  );
}
