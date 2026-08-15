export function LandingFooter() {
  return (
    <footer className="border-t border-accent-border bg-surface px-6 py-10 md:px-12 md:py-12">
      {/* Featured strip — Orynth badge lives here so it's the first thing
          a visitor sees at the fold-bottom without competing with the
          product logo. Direct link to our project page, opens in a new
          tab so we don't yank users out of the funnel. */}
      <div className="mb-8 flex items-center justify-center border-b border-white/5 pb-8">
        <a
          href="https://orynth.dev/projects/mozoflix"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Featured on Orynth"
          className="inline-block transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {/* Plain <img> instead of next/image — the badge is a small
              server-generated SVG that changes over time (view count,
              rank), so remote-optimizing it would just add caching
              headaches. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://orynth.dev/api/badge/mozoflix?theme=dark&style=default"
            alt="Featured on Orynth"
            width={200}
            height={54}
            loading="lazy"
          />
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="font-display text-2xl tracking-[0.05em]">
          MOZO<span className="text-accent">flix</span>
        </div>
        <div className="text-[12px] font-light text-muted">
          © 2026 MOZOflix. Built on Stacks. Secured by Bitcoin.
        </div>
        <div className="flex gap-6">
          {[
            { label: "Docs", href: "/docs" },
            { label: "GitHub", href: "https://github.com/mozoflix" },
            { label: "Twitter", href: "https://twitter.com/MOZOflix" },
            { label: "Discord", href: "https://discord.gg/mozoflix" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-ui text-[12px] font-semibold uppercase tracking-[0.06em] text-muted transition hover:text-accent"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
