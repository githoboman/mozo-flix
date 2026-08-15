export function LandingFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-accent-border bg-surface px-6 py-12 md:px-12">
      <div className="font-display text-2xl tracking-[0.05em]">
        MOZO<span className="text-accent">flix</span>
      </div>
      <div className="text-[12px] font-light text-muted">
        © 2025 MOZOflix. Built on Stacks. Secured by Bitcoin.
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
    </footer>
  );
}
