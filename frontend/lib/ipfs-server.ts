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
    throw new Error(translatePinataError(res.status, text, "file upload"));
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
  // We use pinFileToIPFS (with the JSON serialized as a file body) instead
  // of pinJSONToIPFS. Reason: pinJSONToIPFS requires a specific admin/scoped
  // permission that the Pinata UI silently strips from many "admin" keys,
  // producing intermittent 403s. pinFileToIPFS is available to every key
  // that has any pin scope at all — including the same one our video
  // upload flow already uses — so we get one code path and no scope
  // gotchas. The pinned CID is byte-identical either way.
  const jsonBlob = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
  const form = new FormData();
  form.append("file", jsonBlob, name);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name, keyvalues: { kind: "manifest" } }),
  );

  const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      // NOTE: do NOT set Content-Type — the runtime auto-sets it with the
      // multipart boundary. Setting it manually breaks the upload.
      Authorization: `Bearer ${getJwt()}`,
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(translatePinataError(res.status, text, "manifest pin"));
  }
  const data = (await res.json()) as { IpfsHash: string };
  return { cid: data.IpfsHash };
}

/**
 * Convert raw Pinata error responses into something a creator can act on.
 * Most failures come down to: bad JWT, expired JWT, or out of plan quota.
 */
function translatePinataError(
  status: number,
  body: string,
  context: string,
): string {
  if (status === 401 || status === 403) {
    return `Pinata rejected ${context} (HTTP ${status}). The PINATA_JWT env var is missing, expired, or revoked. Generate a new key at https://app.pinata.cloud/developers/api-keys and update PINATA_JWT.`;
  }
  if (status === 402 || /quota|plan/i.test(body)) {
    return `Pinata ${context} blocked by plan quota (HTTP ${status}). Upgrade the Pinata plan or free up storage.`;
  }
  if (status === 429) {
    return `Pinata rate-limited the ${context}. Wait a minute and retry.`;
  }
  return `Pinata ${context} failed: ${status} ${body.slice(0, 200)}`;
}

/** Convert ipfs:// or bare CID into a gateway URL. */
export function ipfsToGatewayUrl(input: string): string {
  if (!input) return "";
  const cid = input.startsWith("ipfs://") ? input.slice(7) : input;
  return `${PINATA_GATEWAY}/ipfs/${cid}`;
}
