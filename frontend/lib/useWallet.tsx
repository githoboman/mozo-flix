"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isConnected as checkConnected,
  getAddress,
  connectWallet as openConnectModal,
  disconnectWallet,
} from "./stacks";
import { getStxBalance } from "./stacks-reads";
import {
  CHAINS,
  defaultChain,
  type ChainConfig,
  type ChainKind,
} from "./chains";

/**
 * Chain-agnostic wallet context. Exposes the same top-level fields the
 * app has always relied on (address, balance, connected), plus `chain`
 * and `kind` so downstream code can dispatch on Stacks vs EVM without
 * duplicating the hook.
 *
 * NOTE (2026-08-13): EVM support is temporarily neutered while we
 * rebuild the wagmi + ConnectKit setup without the Coinbase Base Account
 * connector (which was pulling in unresolvable @x402/* deps and breaking
 * production builds). The `evm` sub-object is still exposed so callers
 * can keep referencing it — it just always reports disconnected. When
 * we restore EVM, only this file + lib/EvmProvider.tsx need to change.
 */
type WalletKind = ChainKind;

type WalletState = {
  connected: boolean;
  address: string | null;
  balance: bigint;
  loading: boolean;
  kind: WalletKind;
  chain: ChainConfig;
};

type WalletContextValue = WalletState & {
  connect: () => void;
  disconnect: () => void;
  refresh: () => Promise<void>;
  anyConnected: boolean;
  stacks: { connected: boolean; address: string | null; balance: bigint };
  evm: {
    connected: boolean;
    address: string | null;
    balance: bigint;
    chain: ChainConfig | null;
  };
};

const Ctx = createContext<WalletContextValue | null>(null);

const BALANCE_TTL_MS = 30_000;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [stx, setStx] = useState({
    connected: false,
    address: null as string | null,
    balance: 0n,
    loading: true,
  });

  const balanceCache = useRef<Map<string, { value: bigint; at: number }>>(
    new Map(),
  );
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;

    const p = (async () => {
      // Mobile in-app browsers and locked-down environments (SES, etc.) can
      // make @stacks/connect throw. Never let that crash the (app) tree.
      let connected = false;
      let address: string | null = null;
      try {
        connected = checkConnected();
        if (connected) address = getAddress();
      } catch (e) {
        console.warn("[wallet] Stacks connect check failed", e);
      }

      let balance = 0n;
      if (address) {
        const cached = balanceCache.current.get(address);
        if (cached && Date.now() - cached.at < BALANCE_TTL_MS) {
          balance = cached.value;
        } else {
          try {
            balance = await getStxBalance(address);
            balanceCache.current.set(address, {
              value: balance,
              at: Date.now(),
            });
          } catch {
            balance = 0n;
          }
        }
      }
      setStx({ connected, address, balance, loading: false });
    })();

    inflight.current = p;
    try {
      await p;
    } catch (e) {
      console.warn("[wallet] refresh failed", e);
      setStx({
        connected: false,
        address: null,
        balance: 0n,
        loading: false,
      });
    } finally {
      inflight.current = null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(() => {
    openConnectModal(() => {
      balanceCache.current.clear();
      setTimeout(refresh, 200);
    });
  }, [refresh]);

  // EVM stub — always disconnected while EvmProvider is neutered.
  const evm = {
    connected: false,
    address: null as string | null,
    balance: 0n,
    chain: null as ChainConfig | null,
  };

  const value = useMemo<WalletContextValue>(() => {
    const stacksChain =
      CHAINS.find((c) => c.kind === "stacks" && c.enabled) ?? defaultChain();

    return {
      connected: stx.connected,
      address: stx.address,
      balance: stx.balance,
      loading: stx.loading,
      kind: "stacks",
      chain: stacksChain,
      anyConnected: stx.connected,
      stacks: {
        connected: stx.connected,
        address: stx.address,
        balance: stx.balance,
      },
      evm,
      connect,
      disconnect: () => {
        balanceCache.current.clear();
        try {
          disconnectWallet();
        } catch {}
        setStx({
          connected: false,
          address: null,
          balance: 0n,
          loading: false,
        });
      },
      refresh,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stx, connect, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useWallet must be used inside <WalletProvider> (mounted in app/(app)/layout.tsx)",
    );
  }
  return ctx;
}
