/**
 * lib/ipfs.ts — client-safe helpers (no PINATA_JWT here).
 */

const PUBLIC_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud";

/**
 * Public IPFS gateways used as fallbacks when the primary (Pinata) gateway
 * is rate-limited or unreachable. Kept in sync with manifest.ts.
 */
const FALLBACK_GATEWAYS = [
  "https://ipfs.io",
  "https://dweb.link",
  "https://w3s.link",
  "https://4everland.io",
];

/**
 * Hosts the user has confirmed return 401/403 (typically a Pinata dedicated
 * gateway scoped to the owner's pins). Populated by manifest.ts at runtime;
 * shared here so video-file URL builders skip the same dead gateway.
 */
const bannedHosts = new Set<string>();

/** Called by manifest.ts when a gateway returns 401/403 for any CID. */
export function markGatewayUnavailable(url: string) {
  try {
    bannedHosts.add(new URL(url).host);
  } catch {
    // ignore
  }
}

function isBanned(url: string): boolean {
  try {
    return bannedHosts.has(new URL(url).host);
  } catch {
    return false;
  }
}

/** Convert ipfs:// URI or bare CID to a gateway URL. */
export function ipfsToUrl(input?: string | null): string {
  if (!input) return "";
  if (input.startsWith("http")) return input;
  const cid = input.startsWith("ipfs://") ? input.slice(7) : input;
  const primary = `${PUBLIC_GATEWAY}/ipfs/${cid}`;
  if (!isBanned(primary)) return primary;
  // Primary is known-bad this session; switch to the first live fallback.
  const live = FALLBACK_GATEWAYS.find(
    (g) => !bannedHosts.has(new URL(g).host),
  );
  return `${live ?? FALLBACK_GATEWAYS[0]}/ipfs/${cid}`;
}

/**
 * Return every gateway URL we can serve a CID from, primary first.
 * Banned hosts are filtered out so the player doesn't waste retries on
 * gateways we already know will fail.
 */
export function ipfsToUrls(input?: string | null): string[] {
  if (!input) return [];
  if (input.startsWith("http")) return [input];
  const cid = input.startsWith("ipfs://") ? input.slice(7) : input;
  return [
    `${PUBLIC_GATEWAY}/ipfs/${cid}`,
    ...FALLBACK_GATEWAYS.map((g) => `${g}/ipfs/${cid}`),
  ].filter((u) => !isBanned(u));
}

/** Upload a File to our /api/ipfs-upload route. Returns the CID. */
export async function uploadToIPFS(file: File): Promise<{ cid: string; url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/ipfs-upload", { method: "POST", body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as { cid: string; url: string };
}
