"use client";

/**
 * No-op in mozoflix-rewards-v2 (fees are escrowed inside the contract, so
 * sender == fee-recipient no longer breaks fund-pool).
 *
 * Kept as a stub so the studio page import doesn't need to change if we
 * later add an admin-config warning surface.
 */
export function AdminFeeBanner() {
  return null;
}
