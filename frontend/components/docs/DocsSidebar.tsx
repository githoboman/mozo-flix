"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function DocsSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Documentation" className="flex flex-col gap-6">
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
    </nav>
  );
}
