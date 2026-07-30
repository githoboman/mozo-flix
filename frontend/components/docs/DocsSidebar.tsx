"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const SECTIONS: Array<{
  label: string;
  items: Array<{ href: string; label: string }>;
}> = [
  {
    label: "Introduction",
    items: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/how-it-works", label: "How it works" },
    ],
  },
  {
    label: "Guides",
    items: [
      { href: "/docs/viewers", label: "For viewers" },
      { href: "/docs/creators", label: "For creators" },
    ],
  },
  {
    label: "Reference",
    items: [
      { href: "/docs/contracts", label: "Contracts & security" },
      { href: "/docs/moderation", label: "Content policy" },
      { href: "/docs/faq", label: "FAQ" },
    ],
  },
];

function findCurrent(pathname: string): { section: string; label: string } {
  for (const s of SECTIONS) {
    for (const item of s.items) {
      if (item.href === pathname) return { section: s.label, label: item.label };
    }
  }
  return { section: "Documentation", label: "Overview" };
}

export function DocsSidebar() {
  const pathname = usePathname() ?? "";
  const current = findCurrent(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile disclosure whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile: compact disclosure that shows the current page and expands
          to the full list on tap. Keeps the article prose above the fold. */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="docs-nav-mobile"
          className="flex w-full items-center justify-between rounded-lg border border-accent-border bg-card px-4 py-3 text-left transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <span className="flex flex-col">
            <span className="font-ui text-[9px] font-bold uppercase tracking-[0.18em] text-accent">
              {current.section}
            </span>
            <span className="font-ui text-[14px] font-semibold text-white">
              {current.label}
            </span>
          </span>
          <span
            aria-hidden
            className={`material-symbols-outlined text-[22px] text-muted transition-transform ${
              mobileOpen ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </button>

        {mobileOpen && (
          <div
            id="docs-nav-mobile"
            className="mt-2 rounded-lg border border-accent-border bg-card p-4"
          >
            <SidebarList pathname={pathname} />
          </div>
        )}
      </div>

      {/* Desktop: always-visible sticky sidebar */}
      <nav
        aria-label="Documentation"
        className="hidden md:flex md:flex-col md:gap-6"
      >
        <SidebarList pathname={pathname} />
      </nav>
    </>
  );
}

function SidebarList({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="mb-2 px-2 font-ui text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            {section.label}
          </div>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded px-2 py-1.5 font-ui text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                      active
                        ? "bg-accent/15 font-semibold text-accent"
                        : "text-muted hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
