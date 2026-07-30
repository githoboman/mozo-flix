"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Marketing-only navigation.
 *
 * Anchor links (#how, #ai, ...) are shown on the landing page only; on
 * /docs and other pages we drop them since the anchors don't exist. The
 * "Docs" and "Launch App" links are always shown.
 *
 * Every interactive element has a visible focus ring — a11y is table
 * stakes for marketing pages that end up on ecosystem grant lists.
 */
export function LandingNav() {
  const pathname = usePathname() ?? "/";
  const isLandingRoot = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const inDocs = pathname.startsWith("/docs");
  const anchorLinks = isLandingRoot
    ? [
        { href: "#how", label: "How it works" },
        { href: "#ai", label: "AI" },
        { href: "#earn", label: "Earn" },
        { href: "#stacks", label: "Stacks" },
      ]
    : [];

  // Logo goes to the closest "home" for the current section — /docs when
  // reading docs, / when on marketing. Standard behaviour for platforms
  // that have distinct product surfaces (Stripe, Vercel, Linear all do
  // this). Prevents an accidental context-switch mid-read.
  const logoHref = inDocs ? "/docs" : "/";

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-[100] flex items-center justify-between border-b border-accent-border px-4 backdrop-blur-xl transition-all md:px-8 ${
        scrolled ? "h-[60px] bg-bg/95" : "h-[64px] md:h-[72px] bg-bg/80"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
        >
          <span className="material-symbols-outlined text-[22px]">
            {mobileOpen ? "close" : "menu"}
          </span>
        </button>
        <Link
          href={logoHref}
          aria-label={inDocs ? "MOZOflix Docs home" : "MOZOflix home"}
          className="shrink-0 rounded font-display text-2xl tracking-[0.05em] text-white transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:text-3xl"
        >
          MOZO<span className="text-accent">flix</span>
          {inDocs && (
            <span className="ml-2 hidden font-ui text-[11px] font-semibold uppercase tracking-[0.15em] text-muted md:inline">
              / Docs
            </span>
          )}
        </Link>
      </div>

      <div className="hidden items-center gap-8 md:flex">
        {anchorLinks.map((l) => (
          <NavAnchor key={l.href} href={l.href}>
            {l.label}
          </NavAnchor>
        ))}
        <NavAnchor href="/docs" active={pathname.startsWith("/docs")}>
          Docs
        </NavAnchor>
      </div>

      <Link
        href="/browse"
        className="rounded bg-accent px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-black transition hover:-translate-y-0.5 hover:bg-accent-bright hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:px-5 md:py-2.5 md:text-[12px]"
      >
        Launch App →
      </Link>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 top-[64px] z-[99] bg-black/80 backdrop-blur-md md:hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="border-b border-accent-border bg-bg px-6 py-6"
          >
            <nav className="flex flex-col gap-1">
              {anchorLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded px-4 py-3 font-ui text-[13px] font-bold uppercase tracking-[0.1em] text-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/docs"
                className="rounded px-4 py-3 font-ui text-[13px] font-bold uppercase tracking-[0.1em] text-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Docs
              </Link>
            </nav>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavAnchor({
  href,
  children,
  active = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  const isRouterLink = href.startsWith("/");
  const cls = `font-ui text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded ${
    active ? "text-accent" : "text-muted hover:text-accent"
  }`;
  return isRouterLink ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}
