"use client";

import { TopNav } from "@/components/TopNav";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useWallet } from "@/lib/useWallet";

export default function NotificationsPage() {
  const wallet = useWallet();

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[900px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[100px]">
        <div className="mb-2 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          Activity
        </div>
        <h1 className="mb-10 font-display text-[clamp(48px,5vw,80px)] uppercase leading-[0.95]">
          Notifications
        </h1>

        {!wallet.connected && !wallet.loading ? (
          <Empty
            title="Connect your wallet"
            body="Notifications are scoped to your wallet address."
          />
        ) : !isFirebaseConfigured ? (
          <Empty
            title="Notifications need Firebase"
            body="Off-chain activity feed (subscribers, comments, replies, streak reminders) lives in Firestore. Configure NEXT_PUBLIC_FIREBASE_* in .env.local to turn this on."
            mono
          />
        ) : (
          <Empty
            title="You're all caught up"
            body="No new notifications. We'll ping you when someone subscribes, comments, or sends a tip."
          />
        )}
      </main>
    </>
  );
}

function Empty({
  title,
  body,
  mono = false,
}: {
  title: string;
  body: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-accent-border bg-card p-16 text-center">
      <div className="mb-3 text-4xl">{mono ? "🛠" : "🔔"}</div>
      <h2 className="mb-2 font-display text-h2">{title}</h2>
      <p
        className={`mx-auto max-w-md text-[14px] font-light text-muted ${
          mono ? "font-mono" : ""
        }`}
      >
        {body}
      </p>
    </div>
  );
}
