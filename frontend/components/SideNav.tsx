"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MembershipModal } from "./MembershipModal";
import { MovingBorderButton } from "./ui/moving-border";

/**
 * Each category writes itself into the URL as ?cat= and ?sort= on /browse.
 * /browse reads those params and filters its on-chain video list.
 */
const CATEGORIES: Array<{
  icon: string;
  label: string;
  cat?: string;        // matches videoMeta.category
  sort?: "newest" | "reward";
  ownedBy?: "any" | "me";
}> = [
  { icon: "trending_up", label: "Trending", sort: "newest" },
  { icon: "monetization_on", label: "High Rewards", sort: "reward" },
  { icon: "sports_esports", label: "Gaming", cat: "Gaming" },
  { icon: "school", label: "Education", cat: "Education" },
  { icon: "video_camera_front", label: "Creator Hub", ownedBy: "me" },
];

function buildHref(item: (typeof CATEGORIES)[number]): string {
  const p = new URLSearchParams();
  if (item.cat) p.set("cat", item.cat);
  if (item.sort) p.set("sort", item.sort);
  if (item.ownedBy === "me") p.set("owner", "me");
  const qs = p.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

function isActive(
  pathname: string,
  params: URLSearchParams,
  item: (typeof CATEGORIES)[number],
) {
  if (pathname !== "/browse") return false;
  const currentCat = params.get("cat") ?? "";
  const currentSort = params.get("sort") ?? "";
  const currentOwner = params.get("owner") ?? "";
  if (item.cat) return currentCat === item.cat;
  if (item.ownedBy === "me") return currentOwner === "me";
  if (item.sort)
    return currentSort === item.sort && !currentCat && currentOwner !== "me";
  return false;
}

export function SideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [proOpen, setProOpen] = useState(false);

  return (
    <>
      <aside className="fixed left-0 top-[60px] z-40 hidden h-[calc(100vh-60px)] w-64 flex-col border-r border-accent-border bg-surface pt-8 lg:flex">
        <div className="px-6 mb-8">
          <h2 className="mb-1 font-display text-xl tracking-wider text-accent">
            CATEGORIES
          </h2>
          <p className="text-[11px] font-light text-muted">
            Stacks Ecosystem
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {CATEGORIES.map((c) => {
            const active = isActive(pathname ?? "", params, c);
            return (
              <Link
                key={c.label}
                href={buildHref(c)}
                className={`relative flex items-center gap-3 pl-6 py-3 text-left font-ui text-[12px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                  active
                    ? "mr-4 font-black text-black"
                    : "border-l-4 border-transparent text-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="sidenav-active-pill"
                    className="absolute inset-y-0 left-0 right-0 -z-0 rounded-r-full bg-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span
                  className="material-symbols-outlined relative z-[1] text-[20px]"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {c.icon}
                </span>
                <span className="relative z-[1]">{c.label}</span>
              </Link>
            );
          })}
          {(params.get("cat") ||
            params.get("sort") ||
            params.get("owner")) && (
            <button
              onClick={() => router.push("/browse")}
              className="mx-6 mt-4 rounded border border-white/10 py-2 font-ui text-[10px] uppercase tracking-[0.15em] text-muted hover:border-accent hover:text-accent"
            >
              ✕ Clear filters
            </button>
          )}
        </nav>
        <div className="mt-auto border-t border-accent-border p-6">
          <MovingBorderButton
            onClick={() => setProOpen(true)}
            containerClassName="w-full"
            className="w-full px-4 py-3 text-[12px] tracking-[0.08em]"
            duration={4200}
          >
            Go Pro
          </MovingBorderButton>
        </div>
      </aside>

      <MembershipModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        creator="MOZOflix"
      />
    </>
  );
}
