"use client";

import { TopNav } from "@/components/TopNav";
import { useWallet } from "@/lib/useWallet";
import { CreatorProfileForm } from "@/components/CreatorProfileForm";

export default function SettingsPage() {
  const wallet = useWallet();

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[800px] px-4 pb-24 pt-[80px] sm:px-6 md:px-12 md:pt-[120px]">
        <div className="mb-2 flex items-center gap-3 font-ui text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <span className="block h-0.5 w-8 bg-accent" />
          Account
        </div>
        <h1 className="mb-10 font-display text-[clamp(48px,5vw,80px)] uppercase leading-[0.95]">
          Settings
        </h1>

        <div className="space-y-6">
          <Row label="Wallet">
            <div className="font-mono text-[13px]">
              {wallet.address ?? "Not connected"}
            </div>
          </Row>

          <Row label="Network">
            <div className="font-ui text-[13px] uppercase tracking-[0.1em] text-accent">
              {process.env.NEXT_PUBLIC_STACKS_NETWORK ?? "testnet"}
            </div>
          </Row>

          <Row
            label="Creator profile"
            hint="On-chain identity (mozoflix-creators)"
          >
            <CreatorProfileForm />
          </Row>

          <Row label="Notifications" hint="Coming soon">
            <div className="opacity-40">
              <Toggle disabled label="New rewards" />
              <Toggle disabled label="Subscriber updates" />
              <Toggle disabled label="Email digest" />
            </div>
          </Row>

          <Row label="Theme" hint="Cinematic Futurist · dark only for now">
            <div className="font-ui text-[12px] uppercase tracking-[0.1em] text-muted">
              Dark
            </div>
          </Row>

          <Row label="Danger zone">
            <button
              onClick={wallet.disconnect}
              disabled={!wallet.connected}
              className="rounded border border-red-500/40 px-5 py-2.5 font-ui text-[11px] uppercase tracking-[0.1em] text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
            >
              Disconnect wallet
            </button>
          </Row>
        </div>
      </main>
    </>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-accent-border bg-card p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
          {label}
        </div>
        {hint && <span className="text-[10px] text-muted/60">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, disabled = false }: { label: string; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between border-t border-white/5 py-2 first:border-t-0">
      <span className="text-[13px] text-muted">{label}</span>
      <input type="checkbox" disabled={disabled} className="accent-accent" />
    </label>
  );
}
