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

/**
 * Upload a File to IPFS via Pinata. Uses a browser-direct flow:
 *  1. Ask our server to mint a single-use, scoped Pinata API key
 *  2. Upload the file DIRECTLY from the browser to api.pinata.cloud
 *
 * This bypasses Vercel's 4.5 MB serverless function body limit — the
 * previous /api/ipfs-upload route was 500-ing on every real video because
 * it tried to stream the file through Vercel first. XHR is used instead
 * of fetch so we can report progress.
 */
export async function uploadToIPFS(
  file: File,
  opts: { onProgress?: (pct: number) => void } = {},
): Promise<{ cid: string; url: string; size: number }> {
  // 1. Mint a short-lived upload key
  const keyRes = await fetch("/api/pinata-signed-key", { method: "POST" });
  if (!keyRes.ok) {
    const body = await keyRes.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ??
        `Couldn't mint upload key (HTTP ${keyRes.status})`,
    );
  }
  const { jwt } = (await keyRes.json()) as { jwt: string };

  // 2. Direct-upload to Pinata with progress reporting
  return await new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append(
      "pinataMetadata",
      JSON.stringify({
        name: file.name,
        keyvalues: { source: "mozoflix", uploadedAt: Date.now().toString() },
      }),
    );

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.pinata.cloud/pinning/pinFileToIPFS");
    xhr.setRequestHeader("Authorization", `Bearer ${jwt}`);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !opts.onProgress) return;
      opts.onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Network error uploading to Pinata"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let msg = `Pinata rejected upload (HTTP ${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText) as {
            error?: { reason?: string; details?: string };
          };
          if (parsed.error?.reason)
            msg = `Pinata: ${parsed.error.reason}${
              parsed.error.details ? " — " + parsed.error.details : ""
            }`;
        } catch {}
        reject(new Error(msg));
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText) as {
          IpfsHash: string;
          PinSize: number;
        };
        const url = `${PUBLIC_GATEWAY}/ipfs/${data.IpfsHash}`;
        resolve({ cid: data.IpfsHash, url, size: data.PinSize });
      } catch (e) {
        reject(new Error(`Bad response from Pinata: ${(e as Error).message}`));
      }
    };
    xhr.send(form);
  });
}
