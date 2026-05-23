/**
 * lib/errorMessage.ts
 * Translates raw blockchain / API errors into copy a non-technical user can
 * actually understand. Falls back to the original message if nothing matches.
 */

const CONTRACT_CODES: Record<string, string> = {
  // mozoflix-admin
  "u1000": "You're not the owner of this setting — only the platform owner can change it.",
  "u1001": "Platform fee must be 10% or lower.",

  // mozoflix-videos
  "u2000": "Only the creator of this video can change it.",
  "u2001": "That video doesn't exist on-chain yet.",
  "u2002": "Completion threshold must be between 1% and 100%.",
  "u2003": "Reward per view must be greater than 0.",
  "u2004": "Video CID is invalid or missing.",

  // mozoflix-rewards-v2
  "u3000": "MOZOflix is paused right now. Try again in a few minutes.",
  "u3001": "Only the platform can call this. If you're a creator, use /studio instead.",
  "u3002": "Only the original creator can withdraw this pool.",
  "u3003": "Video not found.",
  "u3004": "This video has been deactivated by its creator.",
  "u3005": "You've already earned from this video — each wallet can claim once.",
  "u3006": "Reach 70% of the video to unlock the reward.",
  "u3007": "Pool is empty. The creator needs to fund it before viewers can earn.",
  "u3008": "Amount must be greater than 0.",
  "u3009": "Completion percentage looks invalid.",
  "u3010": "Slow down — wait about an hour between reward claims.",
  "u3011": "STX transfer failed. Check your balance.",
  "u3012": "Nothing to withdraw — the pool is empty.",

  // mozoflix-creators
  "u4000": "Only the platform admin can do that.",
  "u4001": "This wallet hasn't registered a creator profile yet.",
  "u4002": "You already have a creator profile.",
  "u4003": "Display name is required.",
  "u4004": "Bio is too long.",
  "u4005": "Avatar CID is invalid.",

  // mozoflix-referrals
  "u5000": "Only the platform can record referral rewards.",
  "u5001": "You're already referred by someone — referrer can't be changed.",
  "u5002": "You can't refer yourself.",
  "u5003": "You haven't been referred by anyone yet.",
  "u5004": "No referral bonus to claim right now.",
  "u5005": "Referral treasury is too low to pay out — try again later.",
  "u5006": "Amount must be greater than 0.",
};

/**
 * Try to extract a Clarity error code like `u3007` from an arbitrary error
 * message string. Returns null if nothing matches.
 */
function extractCode(msg: string): string | null {
  // Common shapes:
  //   "(err u3007)"
  //   "Runtime error: u3007"
  //   "abort_by_response: (err u3007)"
  const m = msg.match(/u\d{3,5}/);
  return m ? m[0] : null;
}

/**
 * Convert any thrown error → user-friendly string. Keeps the original
 * message as a fallback so debugging still works.
 */
export function friendlyError(err: unknown, ctx?: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : "Something went wrong.";

  // 1) Match a known Clarity error code
  const code = extractCode(raw);
  if (code && CONTRACT_CODES[code]) {
    return CONTRACT_CODES[code];
  }

  // 2) Recognize common network / wallet phrases
  const lower = raw.toLowerCase();
  if (lower.includes("rejected") || lower.includes("user denied")) {
    return "You cancelled the wallet popup. No tx was sent.";
  }
  if (lower.includes("insufficient") || lower.includes("not enough")) {
    return "Not enough STX in your wallet. Top up and try again.";
  }
  if (lower.includes("rate") || lower.includes("429")) {
    return "Server is busy. Wait a few seconds and retry.";
  }
  if (lower.includes("nonce") || lower.includes("conflicting")) {
    return "Another transaction is still pending. Wait ~30 seconds and retry.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Network hiccup. Check your connection and retry.";
  }
  if (lower.includes("unauthorized") || lower.includes("401")) {
    return "Authentication failed. The session may have expired.";
  }
  if (lower.includes("404")) {
    return "We couldn't find that on-chain. It may not exist or hasn't confirmed yet.";
  }
  if (lower.includes("pinata") || lower.includes("ipfs")) {
    return "IPFS upload failed. Try a smaller file or retry in a moment.";
  }

  // 3) Last resort — strip "Error:" prefixes and verbose stack traces
  const cleaned = raw
    .replace(/^Error:\s*/i, "")
    .split("\n")[0]!
    .trim();
  return ctx ? `${ctx}: ${cleaned}` : cleaned;
}
