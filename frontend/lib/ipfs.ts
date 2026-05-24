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

/** Convert ipfs:// URI or bare CID to a gateway URL. */
export function ipfsToUrl(input?: string | null): string {
  if (!input) return "";
  if (input.startsWith("http")) return input;
  const cid = input.startsWith("ipfs://") ? input.slice(7) : input;
  return `${PUBLIC_GATEWAY}/ipfs/${cid}`;
}

/**
 * Return every gateway URL we can serve a CID from, primary first.
 * Useful for video players that can swap source on error.
 */
export function ipfsToUrls(input?: string | null): string[] {
  if (!input) return [];
  if (input.startsWith("http")) return [input];
  const cid = input.startsWith("ipfs://") ? input.slice(7) : input;
  return [
    `${PUBLIC_GATEWAY}/ipfs/${cid}`,
    ...FALLBACK_GATEWAYS.map((g) => `${g}/ipfs/${cid}`),
  ];
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
