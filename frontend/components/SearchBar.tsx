"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = [
  "Stacks Nakamoto",
  "Clarity smart contracts",
  "Bitcoin L2 explained",
  "Web3 gaming",
  "DeFi on Bitcoin",
];

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = (term: string) => {
    if (!term.trim()) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setFocused(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="relative"
      >
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted">
          search
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search videos, creators, tags..."
          className="w-full rounded-lg border border-white/10 bg-card-2 py-2 pl-10 pr-4 text-[13px] text-white placeholder-muted transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </form>

      {focused && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-accent-border bg-card shadow-2xl">
          {SUGGESTIONS.filter((s) =>
            q ? s.toLowerCase().includes(q.toLowerCase()) : true,
          )
            .slice(0, 5)
            .map((s) => (
              <button
                key={s}
                onMouseDown={() => submit(s)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-muted transition hover:bg-white/5 hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">
                  trending_up
                </span>
                {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
