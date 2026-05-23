"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { disconnectWallet } from "@/lib/stacks";

type MenuItem = {
  href: string;
  label: string;
  icon: string;
  creatorOnly?: boolean;
};

const ITEMS: MenuItem[] = [
  { href: "/dashboard", label: "Earnings Dashboard", icon: "account_balance_wallet" },
  { href: "/library", label: "Library", icon: "video_library" },
  { href: "/subscriptions", label: "Subscriptions", icon: "subscriptions" },
  { href: "/referrals", label: "Referrals", icon: "group_add" },
  { href: "/channel/me", label: "My Channel", icon: "person", creatorOnly: true },
  { href: "/studio", label: "Creator Studio", icon: "tune", creatorOnly: true },
  { href: "/upload", label: "Upload Video", icon: "upload", creatorOnly: true },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function UserMenu({
  address = "SP2A…F4X",
  balance = "4.50",
  isCreator = false,
}: {
  address?: string;
  balance?: string;
  isCreator?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-orange-700 font-display text-base text-black"
        aria-label="Account"
      >
        M
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[280px] overflow-hidden rounded-xl border border-accent-border bg-card shadow-2xl">
          <div className="border-b border-white/5 bg-surface px-5 py-4">
            <div className="font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
              Connected
            </div>
            <div className="mt-1 font-mono text-[13px] text-white">{address}</div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted">Balance</span>
              <span className="font-display text-xl text-accent">
                {balance} <span className="text-[12px] text-muted">STX</span>
              </span>
            </div>
          </div>
          <nav className="py-2">
            {ITEMS.filter((it) => !it.creatorOnly || isCreator).map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-5 py-2.5 text-[13px] text-muted transition hover:bg-white/5 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {it.icon}
                </span>
                {it.label}
              </Link>
            ))}
            {!isCreator && (
              <Link
                href="/upload"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center gap-3 border-t border-white/5 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-accent transition hover:bg-accent/5"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add_circle
                </span>
                Become a Creator
              </Link>
            )}
          </nav>
          <button
            onClick={() => {
              setOpen(false);
              disconnectWallet();
              router.push("/");
            }}
            className="block w-full border-t border-white/5 py-3 text-center font-ui text-[11px] uppercase tracking-[0.15em] text-muted transition hover:bg-white/5 hover:text-accent"
          >
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
