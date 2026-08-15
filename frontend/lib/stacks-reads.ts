/**
 * lib/stacks-reads.ts
 * Read-only helpers for fetching state from MOZOflix contracts and the
 * Stacks API. Safe to call from server components and client.
 */

import {
  serializeCV,
  deserializeCV,
  cvToJSON,
  uintCV,
  principalCV,
  type ClarityValue,
} from "@stacks/transactions";

const CONTRACT_OWNER =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E";

const isMainnet = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet";
const HIRO_API = isMainnet
  ? "https://api.hiro.so"
  : "https://api.testnet.hiro.so";

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * serializeCV() in @stacks/transactions v7 returns a hex string in some
 * minors and Uint8Array in others. Normalize to plain hex (no 0x prefix).
 */
function cvToHex(cv: ClarityValue): string {
  const ser = serializeCV(cv) as unknown;
  if (typeof ser === "string") {
    // Already hex — may or may not have 0x prefix
    return ser.startsWith("0x") ? ser.slice(2) : ser;
  }
  return bytesToHex(ser as Uint8Array);
}

// ---------- Generic read wrapper ----------
// Goes through our same-origin /api/stacks/call-read proxy. This avoids:
//   - CORS preflight failures from the browser to Hiro
//   - Per-user-IP rate limits (server uses one IP)
//   - Mixed-content / extension blockers
// Server-side route also handles retry + caching.

async function callReadOnly(
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
  senderAddress = CONTRACT_OWNER,
) {
  const body = JSON.stringify({
    contractAddress: CONTRACT_OWNER,
    contractName,
    functionName,
    sender: senderAddress,
    arguments: functionArgs.map((cv) => `0x${cvToHex(cv)}`),
  });

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("/api/stacks/call-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(
          `Proxy ${res.status}: ${errBody.slice(0, 200)}`,
        );
      }
      const data = (await res.json()) as {
        okay: boolean;
        result?: string;
        cause?: string;
      };
      if (!data.okay) {
        // Recognise the specific "contracts aren't deployed" failure and
        // hand back a plain-language, actionable message. Stacks testnet
        // is periodically reset (Nakamoto activations, chain migrations)
        // — when that happens every previously-deployed contract vanishes
        // and the frontend keeps calling into a dead address. Without
        // this branch users see a raw Clarity trace and think it's a
        // frontend bug.
        const cause = data.cause ?? "unknown";
        if (/NoSuchContract/i.test(cause)) {
          const network = isMainnet ? "mainnet" : "testnet";
          throw new Error(
            `The MOZOflix contracts aren't deployed at ${CONTRACT_OWNER} on ${network}. ` +
              `This usually means the Stacks ${network} was reset — the address exists but has zero transactions. ` +
              `Fix: redeploy the contracts (see contracts/DEPLOY.md → 'clarinet deployments apply --testnet') ` +
              `or point NEXT_PUBLIC_CONTRACT_ADDRESS at a live deployer address.`,
          );
        }
        throw new Error(`Contract call failed: ${cause}`);
      }
      const cv = deserializeCV(data.result!);
      return cvToJSON(cv);
    } catch (e) {
      lastErr = e;
      const msg = (e as Error).message ?? String(e);
      if (
        attempt < 2 &&
        (msg.includes("fetch") || msg.includes("Proxy 5"))
      ) {
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
        continue;
      }
      console.error("[callReadOnly]", {
        contractName,
        functionName,
        error: msg,
      });
      // Preserve the actionable message from the NoSuchContract branch
      // verbatim (don't append `(called ...)` — the whole point is the
      // user needs to redeploy, not know which read failed first).
      if (/testnet was reset|contracts aren't deployed/i.test(msg)) {
        throw e;
      }
      throw new Error(
        `${msg} (called ${contractName}.${functionName})`,
      );
    }
  }
  throw lastErr;
}

// ---------- mozoflix-videos ----------

export type VideoMeta = {
  id: number;
  creator: string;
  contentHash: string;        // decoded UTF-8 string, e.g. "ipfs://Qm..."
  contentHashRaw: string;     // raw hex from chain, e.g. "0x69706673..."
  rewardPerView: bigint;
  minCompletionPct: number;
  active: boolean;
  createdAt: number;
};

/**
 * Decode a Clarity `(buff 64)` value (returned as 0x-prefixed hex) into the
 * UTF-8 string it was constructed from. Strips trailing null padding.
 */
function decodeBuffString(hex: string): string {
  if (!hex) return "";
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  let out = "";
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (byte === 0) break;
    out += String.fromCharCode(byte);
  }
  return out;
}

export async function getVideo(id: number): Promise<VideoMeta | null> {
  const json = await callReadOnly("mozoflix-videos", "get-video", [
    uintCV(id),
  ]);
  if (!json?.value || json.value === null) return null;
  const v = json.value.value;
  const rawHash = v["content-hash"].value as string;
  return {
    id,
    creator: v.creator.value,
    contentHash: decodeBuffString(rawHash),
    contentHashRaw: rawHash,
    rewardPerView: BigInt(v["reward-per-view"].value),
    minCompletionPct: Number(v["min-completion-pct"].value),
    active: v.active.value,
    createdAt: Number(v["created-at"].value),
  };
}

export async function getTotalVideos(): Promise<number> {
  const json = await callReadOnly(
    "mozoflix-videos",
    "get-total-videos",
    [],
  );
  return Number(json?.value ?? 0);
}

/**
 * Returns the ID that will be assigned to the *next* `register-video` call.
 * Use this before submitting register-video to know where to attach metadata.
 */
export async function getNextVideoId(): Promise<number> {
  const json = await callReadOnly("mozoflix-videos", "get-next-id", []);
  return Number(json?.value ?? 1);
}

/**
 * List all videos by walking IDs 1..total.
 *
 * We fetch in parallel batches (concurrency cap) instead of fully sequentially.
 * Fully parallel hammers Hiro's public RPC and gets rate-limited; fully serial
 * means ~600ms per video. A small fixed concurrency is the sweet spot —
 * roughly N/CONCURRENCY × per-call latency.
 */
const LIST_CONCURRENCY = 5;

export async function listVideos(): Promise<VideoMeta[]> {
  const total = await getTotalVideos();
  if (total <= 0) return [];

  const ids = Array.from({ length: total }, (_, i) => i + 1);
  const out: VideoMeta[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try {
        const v = await getVideo(id!);
        if (v) out.push(v);
      } catch (e) {
        console.warn(`listVideos: skipping #${id}:`, (e as Error).message);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(LIST_CONCURRENCY, ids.length) }, worker),
  );

  // Restore deterministic ordering (workers complete out of order)
  out.sort((a, b) => a.id - b.id);
  return out;
}

// ---------- mozoflix-admin ----------

export async function getAdminConfig() {
  const [owner, feeRecipient, feeBps, paused] = await Promise.all([
    callReadOnly("mozoflix-admin", "get-owner", []),
    callReadOnly("mozoflix-admin", "get-fee-recipient", []),
    callReadOnly("mozoflix-admin", "get-fee-bps", []),
    callReadOnly("mozoflix-admin", "is-paused", []),
  ]);
  return {
    owner: owner.value as string,
    feeRecipient: feeRecipient.value as string,
    feeBps: Number(feeBps.value ?? 0),
    paused: Boolean(paused?.value),
  };
}

// ---------- mozoflix-rewards ----------

export type PoolState = {
  balance: bigint;
  totalFunded: bigint;
  totalDistributed: bigint;
  claimCount: number;
};

export async function getPool(videoId: number): Promise<PoolState> {
  const json = await callReadOnly("mozoflix-rewards-v2", "get-pool", [
    uintCV(videoId),
  ]);
  const p = json.value;
  return {
    balance: BigInt(p.balance.value),
    totalFunded: BigInt(p["total-funded"].value),
    totalDistributed: BigInt(p["total-distributed"].value),
    claimCount: Number(p["claim-count"].value),
  };
}

export async function hasClaimed(
  videoId: number,
  viewer: string,
): Promise<boolean> {
  const json = await callReadOnly("mozoflix-rewards-v2", "has-claimed", [
    uintCV(videoId),
    principalCV(viewer),
  ]);
  return Boolean(json?.value);
}

// ---------- mozoflix-creators ----------

export type CreatorProfile = {
  displayName: string;
  bio: string;
  avatarHash: string;
  verified: boolean;
  joinedAt: number;
  reputation: number;
};

export async function getCreatorProfile(
  address: string,
): Promise<CreatorProfile | null> {
  const json = await callReadOnly("mozoflix-creators", "get-profile", [
    principalCV(address),
  ]);
  if (!json?.value || json.value === null) return null;
  const p = json.value.value;
  return {
    displayName: p["display-name"].value,
    bio: p.bio.value,
    avatarHash: p["avatar-hash"].value,
    verified: p.verified.value,
    joinedAt: Number(p["joined-at"].value),
    reputation: Number(p.reputation.value),
  };
}

// ---------- mozoflix-referrals ----------

export async function getReferrer(referee: string): Promise<string | null> {
  const json = await callReadOnly("mozoflix-referrals", "get-referrer", [
    principalCV(referee),
  ]);
  return json?.value?.value ?? null;
}

export async function getReferralPending(referrer: string): Promise<bigint> {
  const json = await callReadOnly("mozoflix-referrals", "get-pending", [
    principalCV(referrer),
  ]);
  return BigInt(json?.value ?? 0);
}

// ---------- Stacks API helpers ----------

/** STX balance in micro-STX. */
export async function getStxBalance(address: string): Promise<bigint> {
  try {
    const res = await fetch(
      `${HIRO_API}/extended/v1/address/${address}/balances`,
      { cache: "no-store" },
    );
    if (!res.ok) return 0n;
    const data = await res.json();
    return BigInt(data?.stx?.balance ?? 0);
  } catch {
    return 0n;
  }
}

/** Recent transactions for an address. */
export async function getAddressTransactions(
  address: string,
  limit = 20,
): Promise<unknown[]> {
  try {
    const res = await fetch(
      `${HIRO_API}/extended/v1/address/${address}/transactions?limit=${limit}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}
