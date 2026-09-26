"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia, base, celo, celoAlfajores } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [baseSepolia, base, celoAlfajores, celo],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo" }),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
    [celoAlfajores.id]: http(),
    [celo.id]: http(),
  },
});

export function EvmProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
