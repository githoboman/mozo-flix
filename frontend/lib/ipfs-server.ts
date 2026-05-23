/**
 * lib/ipfs-server.ts
 * Server-only Pinata helpers. The PINATA_JWT env var is NOT exposed to
 * the client — keep all calls behind /api/* routes.
 */

const PINATA_API = "https://api.pinata.cloud";
const PINATA_GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud";

function getJwt(): string {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error(
      "PINATA_JWT is not set. Add it to .env.local (server-side, no NEXT_PUBLIC_ prefix).",
    );
  }
  return jwt;
}

export async function pinFileToIPFS(
  file: File,
  metadata?: Record<string, unknown>,
): Promise<{ cid: string; size: number; url: string }> {
  const form = new FormData();
  form.append("file", file);
  if (metadata) {
    form.append(
      "pinataMetadata",
      JSON.stringify({ name: file.name, keyvalues: metadata }),
    );
  }

  const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getJwt()}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { IpfsHash: string; PinSize: number };
  return {
    cid: data.IpfsHash,
    size: data.PinSize,
    url: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
  };
}

export async function pinJsonToIPFS(
  payload: unknown,
  name = "metadata.json",
): Promise<{ cid: string }> {
  const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getJwt()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataMetadata: { name },
      pinataContent: payload,
    }),
  });
  if (!res.ok) {
    throw new Error(`Pinata JSON pin failed: ${res.status}`);
  }
  const data = (await res.json()) as { IpfsHash: string };
  return { cid: data.IpfsHash };
}

/** Convert ipfs:// or bare CID into a gateway URL. */
export function ipfsToGatewayUrl(input: string): string {
  if (!input) return "";
  const cid = input.startsWith("ipfs://") ? input.slice(7) : input;
  return `${PINATA_GATEWAY}/ipfs/${cid}`;
}
