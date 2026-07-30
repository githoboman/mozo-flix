"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";

// Real notifications will be fetched from Firestore via getNotifications().
// Until Firebase is wired + populated, this is always empty.
const BASE_NOTIFICATIONS: Array<{
  icon: string;
  text: string;
  sub: string;
  time: string;
  unread: boolean;
  accent: boolean;
}> = [];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const notifications = allRead
    ? BASE_NOTIFICATIONS.map((n) => ({ ...n, unread: false, accent: false }))
    : BASE_NOTIFICATIONS;

  const unreadCount = notifications.filter((n) => n.unread).length;

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
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-card-2 text-muted transition hover:border-accent hover:text-accent"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-ui text-[9px] font-bold text-black">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-accent-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <span className="font-ui text-[12px] font-bold uppercase tracking-[0.15em]">
              Notifications
            </span>
            <button
              onClick={() => setAllRead(true)}
              disabled={allRead}
              className="font-ui text-[10px] uppercase tracking-[0.1em] text-accent transition hover:text-accent-bright disabled:opacity-40"
            >
              {allRead ? "✓ All Read" : "Mark all read"}
            </button>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 && (
              <div className="px-5 py-8 text-center">
                <div className="mb-1 text-2xl">🔔</div>
                <div className="font-ui text-[11px] uppercase tracking-[0.1em] text-muted">
                  All caught up
                </div>
                {!isFirebaseConfigured && (
                  <p className="mt-2 text-[10px] text-muted/60">
                    Activity feed shipping in v2
                  </p>
                )}
              </div>
            )}
            {notifications.map((n, i) => (
              <button
                key={i}
                className={`flex w-full items-start gap-3 border-b border-white/5 px-5 py-3 text-left transition hover:bg-white/[0.03] ${
                  n.unread ? "bg-white/[0.02]" : ""
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    n.accent ? "bg-accent-dim text-accent" : "bg-white/5 text-muted"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{n.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-ui text-[12px] font-semibold text-white">{n.text}</span>
                    <span className="text-[10px] text-muted">{n.time}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-light text-muted">{n.sub}</p>
                </div>
                {n.unread && (
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                )}
              </button>
            ))}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-white/5 py-3 text-center font-ui text-[11px] uppercase tracking-[0.15em] text-accent hover:bg-white/[0.03]"
          >
            View All →
          </Link>
        </div>
      )}
    </div>
  );
}
