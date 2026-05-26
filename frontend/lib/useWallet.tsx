"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

type WalletState = {
  connected: boolean;
  address: string | null;
  balance: bigint;
  loading: boolean;
};

type WalletContextValue = WalletState & {
  connect: () => void;
  disconnect: () => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<WalletContextValue | null>(null);

/** Balance is fairly stable; cache for 30s to avoid refetching on navigation. */
const BALANCE_TTL_MS = 30_000;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: 0n,
    loading: true,
  });

  // Cache last balance + when we fetched it, keyed by address.
  const balanceCache = useRef<Map<string, { value: bigint; at: number }>>(
    new Map(),
  );
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    // Dedupe simultaneous refresh calls
    if (inflight.current) return inflight.current;

    const p = (async () => {
      // Mobile in-app browsers and locked-down environments (SES, etc.) can
      // make @stacks/connect throw. Never let that crash the (app) tree —
      // fall back to disconnected state instead.
      let connected = false;
      let address: string | null = null;
      try {
        connected = checkConnected();
        if (connected) address = getAddress();
      } catch (e) {
        console.warn("[wallet] connect check failed; treating as disconnected", e);
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
      setState({ connected, address, balance, loading: false });
    })();

    inflight.current = p;
    try {
      await p;
    } catch (e) {
      console.warn("[wallet] refresh failed", e);
      setState({
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
      // Bust the cache so the new wallet's balance is fetched fresh
      balanceCache.current.clear();
      setTimeout(refresh, 200);
    });
  }, [refresh]);

  const disconnect = useCallback(() => {
    balanceCache.current.clear();
    disconnectWallet();
    setState({
      connected: false,
      address: null,
      balance: 0n,
      loading: false,
    });
  }, []);

  return (
    <Ctx.Provider value={{ ...state, connect, disconnect, refresh }}>
      {children}
    </Ctx.Provider>
  );
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
