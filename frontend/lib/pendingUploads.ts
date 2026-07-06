/**
 * lib/pendingUploads.ts
 * Local persistence for videos the current wallet has just published but
 * that haven't been confirmed on-chain yet. We store the manifest+register
 * tx ids and cross them off automatically once the video shows up in the
 * on-chain `listVideos` output.
 *
 * This solves the "I uploaded but nothing appears" bug — testers see the
 * publish success and then wait 5-10 minutes for the tx to confirm without
 * any feedback. Now they get a "Registering on-chain" chip until it lands.
 */

const KEY = "mozoflix:pendingUploads";

export type PendingUpload = {
  /** The video id we expected the contract to assign (from get-next-id). */
  expectedId: number;
  title: string;
  category?: string;
  registerTx: string;
  manifestCid: string;
  videoCid?: string;
  /** Data-URL or ipfs:// URL for the thumbnail so the card shows something. */
  thumbnail?: string;
  uploaderAddress: string;
  createdAt: number;
};

function readAll(): PendingUpload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingUpload[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: PendingUpload[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // localStorage full — drop oldest
    try {
      localStorage.setItem(KEY, JSON.stringify(items.slice(-20)));
    } catch {
      // ignore
    }
  }
}

export function addPendingUpload(u: PendingUpload) {
  const all = readAll();
  // Replace any existing entry for this expectedId (retries etc.)
  const filtered = all.filter((p) => p.expectedId !== u.expectedId);
  writeAll([...filtered, u]);
}

export function removePendingUpload(expectedId: number) {
  writeAll(readAll().filter((p) => p.expectedId !== expectedId));
}

export function getPendingUploads(uploaderAddress?: string): PendingUpload[] {
  const all = readAll();
  // Auto-expire entries older than 24h — the tx should have confirmed
  // by then, and if it hasn't the creator can re-upload.
  const now = Date.now();
  const fresh = all.filter((p) => now - p.createdAt < 24 * 60 * 60 * 1000);
  if (fresh.length !== all.length) writeAll(fresh);
  if (!uploaderAddress) return fresh;
  return fresh.filter((p) => p.uploaderAddress === uploaderAddress);
}

/**
 * Called after we successfully read the on-chain video list — any pending
 * upload whose expected id is now on-chain gets removed.
 */
export function reconcilePendingUploads(knownVideoIds: number[]) {
  const known = new Set(knownVideoIds);
  const all = readAll();
  const remaining = all.filter((p) => !known.has(p.expectedId));
  if (remaining.length !== all.length) writeAll(remaining);
}
