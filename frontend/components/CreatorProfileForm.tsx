"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/useWallet";
import { registerCreatorProfile } from "@/lib/stacks";
import { getCreatorProfile, type CreatorProfile } from "@/lib/stacks-reads";

export function CreatorProfileForm() {
  const wallet = useWallet();
  const [profile, setProfile] = useState<CreatorProfile | null | "loading">(
    "loading",
  );
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "signing" }
    | { kind: "submitted"; txid: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  useEffect(() => {
    if (!wallet.address) return;
    getCreatorProfile(wallet.address).then((p) => setProfile(p));
  }, [wallet.address]);

  if (!wallet.address) {
    return (
      <div className="text-[13px] text-muted">
        Connect a wallet to register your creator profile.
      </div>
    );
  }

  if (profile === "loading") {
    return <div className="text-[13px] text-muted">Loading profile…</div>;
  }

  if (profile) {
    return (
      <div className="space-y-2 text-[13px]">
        <div>
          <span className="text-muted">Display name: </span>
          <span className="font-ui font-bold">{profile.displayName}</span>
          {profile.verified && <span className="ml-2 text-accent">✓ Verified</span>}
        </div>
        <div>
          <span className="text-muted">Bio: </span>
          <span className="font-light">{profile.bio || "—"}</span>
        </div>
        <div>
          <span className="text-muted">Joined block: </span>
          <span className="font-mono">{profile.joinedAt}</span>
        </div>
        <p className="mt-3 text-[11px] text-muted/60">
          On-chain profile registered. Update flow coming soon.
        </p>
      </div>
    );
  }

  const submit = async () => {
    if (!name.trim()) {
      setStatus({ kind: "error", message: "Display name required" });
      return;
    }
    setStatus({ kind: "signing" });
    try {
      // Avatar field on-chain is a (buff 64). For MVP, accept a CID or short
      // string; pad/truncate to fit.
      const avatarHex = Buffer.from(
        (avatar || "default").slice(0, 30),
        "utf8",
      ).toString("hex");
      await registerCreatorProfile(
        name.trim().slice(0, 32),
        bio.trim().slice(0, 200),
        avatarHex,
        (txid) => setStatus({ kind: "submitted", txid }),
      );
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
          Display name (max 32 chars)
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="SilkyJones"
          maxLength={32}
          className="w-full rounded border border-white/10 bg-surface px-4 py-3 text-[14px] focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
          Bio (max 200 chars)
        </div>
        <textarea
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Building on Stacks since 2023."
          maxLength={200}
          className="w-full resize-none rounded border border-white/10 bg-surface p-3 text-[13px] focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <div className="mb-1 font-ui text-[10px] uppercase tracking-[0.15em] text-muted">
          Avatar (IPFS CID or label, optional)
        </div>
        <input
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="QmXyz... or your handle"
          className="w-full rounded border border-white/10 bg-surface px-4 py-3 text-[14px] focus:border-accent focus:outline-none"
        />
      </div>

      {status.kind === "error" && (
        <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-[12px] text-red-300">
          {status.message}
        </div>
      )}
      {status.kind === "submitted" && (
        <div className="rounded border border-green-500/40 bg-green-500/10 p-3 text-[12px] text-green-300">
          ✓ Profile registered. tx:{" "}
          <a
            href={`https://explorer.hiro.so/txid/${status.txid}?chain=testnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono underline"
          >
            {status.txid.slice(0, 14)}…
          </a>
        </div>
      )}

      <button
        onClick={submit}
        disabled={status.kind === "signing"}
        className="w-full rounded bg-accent py-3 font-ui text-[12px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-accent-bright disabled:opacity-50"
      >
        {status.kind === "signing"
          ? "Confirm in wallet…"
          : "Register Profile On-Chain →"}
      </button>
    </div>
  );
}
