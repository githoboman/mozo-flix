"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WalletModal } from "./WalletModal";
import { SearchBar } from "./SearchBar";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { useWallet } from "@/lib/useWallet";
import { useIsCreator } from "@/lib/useIsCreator";
import { microToStx } from "@/lib/stacks";

const VIEWER_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/library", label: "Library" },
  { href: "/dashboard", label: "Earnings" },
];
const CREATOR_LINKS = [{ href: "/studio", label: "Studio" }];

export function TopNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const wallet = useWallet();
  const { isCreator, loading: creatorLoading } = useIsCreator();
  const isLanding = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const shortAddress = wallet.address
    ? `${wallet.address.slice(0, 4)}…${wallet.address.slice(-4)}`
    : "";

  const navLinks =
    isLanding && !wallet.connected
      ? []
      : isCreator
      ? [...VIEWER_LINKS, ...CREATOR_LINKS]
      : VIEWER_LINKS;

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-[100] flex items-center gap-3 border-b border-accent-border px-4 backdrop-blur-xl transition-all md:gap-6 md:px-8 ${
          scrolled ? "h-[60px] bg-bg/95" : "h-[64px] md:h-[72px] bg-bg/85"
        }`}
      >
        {/* Mobile menu toggle (visible <xl) */}
        {navLinks.length > 0 && (
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Menu"
            className="xl:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-accent"
          >
            <span className="material-symbols-outlined text-[22px]">
              {drawerOpen ? "close" : "menu"}
            </span>
          </button>
        )}

        <Link
          href="/"
          className="shrink-0 font-display text-2xl tracking-[0.05em] text-white md:text-3xl"
        >
          MOZO<span className="text-accent">flix</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-md xl:flex">
          {navLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`reveal-underline font-ui text-[12px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-accent"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop search (md+, not on landing) */}
        {!isLanding && (
          <div className="hidden flex-1 justify-center md:flex">
            <SearchBar />
          </div>
        )}
        {(isLanding || !navLinks.length) && <div className="flex-1" />}

        {/* Mobile search icon */}
        {!isLanding && (
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:text-accent"
          >
            <span className="material-symbols-outlined text-[20px]">
              {searchOpen ? "close" : "search"}
            </span>
          </button>
        )}

        <div className="flex items-center gap-2 md:gap-3">
          {/* Upload — desktop only inline. Mobile users get it via drawer/menu. */}
          {wallet.connected && !creatorLoading &&
            (isCreator ? (
              <Link
                href="/upload"
                className="hidden h-10 items-center gap-2 rounded border border-white/10 bg-card-2 px-4 font-ui text-[11px] font-bold uppercase tracking-[0.1em] text-white transition hover:border-accent hover:text-accent md:flex"
              >
                <span className="material-symbols-outlined text-[16px]">
                  upload
                </span>
                Upload
              </Link>
            ) : (
              <Link
                href="/upload"
                className="hidden h-10 items-center gap-2 rounded border border-accent/30 bg-accent-dim px-3 font-ui text-[10px] font-bold uppercase tracking-[0.1em] text-accent transition hover:border-accent lg:flex"
                title="Upload your first video to become a creator"
              >
                Become Creator
              </Link>
            ))}
          {wallet.connected && creatorLoading && (
            <div className="hidden h-10 w-24 animate-shimmer rounded md:block" />
          )}

          {wallet.connected && wallet.address ? (
            <>
              <NotificationBell />
              <UserMenu
                address={shortAddress}
                balance={microToStx(wallet.balance)}
                isCreator={isCreator}
              />
            </>
          ) : (
            <button
              onClick={() => setWalletOpen(true)}
              disabled={wallet.loading}
              className="rounded bg-accent px-3 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.05em] text-black transition hover:-translate-y-0.5 hover:bg-accent-bright hover:shadow-glow disabled:opacity-50 md:px-5 md:py-2.5 md:text-[12px] md:tracking-[0.08em]"
            >
              {wallet.loading ? "..." : "Connect"}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile search drawer */}
      {searchOpen && !isLanding && (
        <div className="fixed inset-x-0 top-[64px] z-[99] border-b border-accent-border bg-bg p-4 md:hidden">
          <SearchBar />
        </div>
      )}

      {/* Mobile nav drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 top-[64px] z-[99] bg-black/80 backdrop-blur-md xl:hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="border-b border-accent-border bg-bg px-6 py-6"
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded px-4 py-3 font-ui text-[13px] font-bold uppercase tracking-[0.1em] transition ${
                      active
                        ? "bg-accent text-black"
                        : "text-muted hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
              {wallet.connected && (
                <Link
                  href="/upload"
                  className={`mt-2 rounded border px-4 py-3 font-ui text-[13px] font-bold uppercase tracking-[0.1em] transition ${
                    isCreator
                      ? "border-white/10 bg-card-2 text-white"
                      : "border-accent/30 bg-accent-dim text-accent"
                  }`}
                >
                  {isCreator ? "↑ Upload Video" : "+ Become a Creator"}
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}

      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        onConnected={wallet.refresh}
      />
    </>
  );
}
