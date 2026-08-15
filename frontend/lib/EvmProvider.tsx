"use client";

import type { ReactNode } from "react";

/**
 * lib/EvmProvider.tsx
 *
 * TEMPORARILY DISABLED (2026-08-13).
 *
 * ConnectKit's `getDefaultConfig` transitively loads @wagmi/connectors →
 * @base-org/account → @coinbase/cdp-sdk, which references half a dozen
 * `@x402/*` packages that aren't published as separate npm modules. Every
 * webpack fallback we add uncovers another missing path, and the build
 * keeps failing on Vercel — which was blocking the Orynth ownership
 * verification for mozoflix.com.
 *
 * This file was originally a full wagmi + ConnectKit provider (see the
 * git history) and will be restored when we bring EVM support back with
 * a leaner connector setup — manual `injected()` + `walletConnect()`
 * only, no Coinbase/Base Account, no CDP SDK. The chain registry, the
 * Solidity contract, and the deploy plan are all still in place; only
 * the client-side EVM wallet layer is switched off.
 *
 * While disabled, this component is a plain pass-through so `(app)/layout`
 * can keep importing it unchanged.
 */
export function EvmProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
