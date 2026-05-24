"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Marketing-only navigation for the landing page.
 *
 * Deliberately lightweight — no wallet hooks, no contract reads, no
 * search bar. The Connect/Launch CTA in the hero is the primary action;
 * this nav just frames the page and offers section anchors + a route
 * into the app for returning visitors.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-[100] flex items-center justify-between border-b border-accent-border px-4 backdrop-blur-xl transition-all md:px-8 ${
        scrolled ? "h-[60px] bg-bg/95" : "h-[64px] md:h-[72px] bg-bg/80"
      }`}
    >
      <Link
        href="/"
        className="shrink-0 font-display text-2xl tracking-[0.05em] text-white md:text-3xl"
      >
        MOZO<span className="text-accent">flix</span>
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        <a
          href="#how"
          className="font-ui text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
        >
          How it works
        </a>
        <a
          href="#earn"
          className="font-ui text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
        >
          Earn
        </a>
        <a
          href="#stacks"
          className="font-ui text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
        >
          Built on Stacks
        </a>
      </div>

      <Link
        href="/browse"
        className="rounded bg-accent px-4 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-black transition hover:-translate-y-0.5 hover:bg-accent-bright hover:shadow-glow md:px-5 md:py-2.5 md:text-[12px]"
      >
        Launch App →
      </Link>
    </nav>
  );
}
