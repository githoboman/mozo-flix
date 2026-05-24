"use client";

import { TopNav } from "@/components/TopNav";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useWallet } from "@/lib/useWallet";

export default function SubscriptionsPage() {
  const wallet = useWallet();

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[100px]">
        <div className="mb-2 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          Following
        </div>
        <h1 className="mb-10 font-display text-[clamp(48px,5vw,80px)] uppercase leading-[0.95]">
          Your <span className="text-accent">Subscriptions</span>
        </h1>

        {!wallet.connected && !wallet.loading ? (
          <Empty
            title="Connect your wallet"
            body="Subscriptions are tied to your wallet address. Connect to see who you follow."
          />
        ) : !isFirebaseConfigured ? (
          <Empty
            title="Subscriptions need Firebase"
            body="Subscription data lives off-chain. Add NEXT_PUBLIC_FIREBASE_* to your .env.local to enable this view. Until then it's blank."
            mono
          />
        ) : (
          <Empty
            title="No subscriptions yet"
            body="Find a creator on the browse page and hit Subscribe to populate this feed."
            cta={{ href: "/browse", label: "Browse Creators →" }}
          />
        )}
      </main>
    </>
  );
}

function Empty({
  title,
  body,
  cta,
  mono = false,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-accent-border bg-card p-16 text-center">
      <div className="mb-3 text-4xl">{mono ? "🛠" : "📡"}</div>
      <h2 className="mb-2 font-display text-h2">{title}</h2>
      <p
        className={`mx-auto max-w-md text-[14px] font-light text-muted ${
          mono ? "font-mono" : ""
        }`}
      >
        {body}
      </p>
      {cta && (
        <a
          href={cta.href}
          className="mt-6 inline-block rounded bg-accent px-6 py-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-black hover:bg-accent-bright"
        >
          {cta.label}
        </a>
      )}
    </div>
  );
}
