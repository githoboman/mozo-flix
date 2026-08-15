"use client";

/**
 * lib/EvmProvider.tsx
 * wagmi + ConnectKit setup, isolated in a client boundary so no EVM
 * runtime lands in the landing bundle. Consumed by (app)/layout.tsx.
 *
 * We only register the EVM chains we've enabled in lib/chains.ts, so a
 * disabled Celo doesn't waste a WalletConnect session slot. Adding a new
 * EVM chain later is: (1) flip `enabled: true` in chains.ts, (2) add
 * the viem chain here — no other frontend change.
 */

import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia, base, celoAlfajores, celo } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import type { ReactNode } from "react";
import { CHAINS, type EvmChainConfig } from "./chains";

const VIEM_CHAINS = {
  "base-sepolia": baseSepolia,
  "base-mainnet": base,
  "celo-alfajores": celoAlfajores,
  "celo-mainnet": celo,
} as const;

function activeEvmChains() {
  const evm = CHAINS.filter(
    (c): c is EvmChainConfig => c.kind === "evm" && c.enabled,
  );
  return evm
    .map((c) => VIEM_CHAINS[c.id as keyof typeof VIEM_CHAINS])
    .filter(Boolean);
}

/** WalletConnect project id — free from cloud.reown.com. Optional but
 *  strongly recommended; without it the WalletConnect option won't work. */
const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "00000000000000000000000000000000"; // placeholder, replace before launch

const chains = activeEvmChains();

/**
 * If there are no enabled EVM chains, we skip wagmi entirely — no
 * WalletConnect session opens, no HTTP transports get built. Keeps the
 * bundle honest until Base/Celo are actually ready to onboard viewers.
 */
const wagmiConfig =
  chains.length > 0
    ? createConfig(
        getDefaultConfig({
          appName: "MOZOflix",
          appDescription: "Watch-to-earn video on Bitcoin, Base and Celo",
          appUrl: "https://mozoflix.com",
          appIcon: "https://mozoflix.com/logo.png",
          walletConnectProjectId: WC_PROJECT_ID,
          // Non-empty tuple is required by wagmi's type — enabled chains only.
          chains: chains as unknown as readonly [
            (typeof chains)[number],
            ...(typeof chains)[number][],
          ],
          transports: Object.fromEntries(
            chains.map((c) => [c.id, http()]),
          ) as Record<number, ReturnType<typeof http>>,
        }),
      )
    : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function EvmProvider({ children }: { children: ReactNode }) {
  // No EVM chains enabled → pass-through, no wagmi runtime cost.
  if (!wagmiConfig) return <>{children}</>;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          mode="dark"
          options={{
            hideBalance: false,
            hideNoWalletCTA: false,
            initialChainId: chains[0]?.id ?? 0,
          }}
          customTheme={{
            "--ck-font-family": "var(--font-dm-sans), system-ui, sans-serif",
            "--ck-accent-color": "#ff6b00",
            "--ck-accent-text-color": "#000000",
            "--ck-primary-button-background": "#ff6b00",
            "--ck-primary-button-color": "#000000",
            "--ck-primary-button-hover-background": "#ff8a3d",
            "--ck-border-radius": "8px",
            "--ck-modal-background": "#111120",
            "--ck-body-background": "#111120",
            "--ck-body-color": "#ffffff",
            "--ck-body-color-muted": "#8a8a9e",
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}