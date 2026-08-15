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
  useAccount as useEvmAccount,
  useBalance as useEvmBalance,
  useDisconnect as useEvmDisconnect,
} from "wagmi";
import {
  CHAINS,
  defaultChain,
  getChainByEvmChainId,
  type ChainConfig,
  type ChainKind,
} from "./chains";

/**
 * Chain-agnostic wallet state. `useWallet()` still returns the same
 * top-level fields the app has always relied on (address, balance,
 * connected), but now also carries `chain` + `kind` so downstream code
 * can dispatch on Stacks vs EVM without duplicating the hook.
 *
 * Precedence when both are connected:
 *   1. Whichever the user most recently connected (last-write-wins).
 *   2. Falls back to Stacks if we can't tell.
 *
 * All balances are in the chain's smallest unit (µSTX for Stacks, wei
 * or token base units for EVM). Callers format via lib/format.
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
  /** True when either a Stacks or EVM wallet is currently connected. */
  anyConnected: boolean;
  /** Raw sub-states for pages that need to show both simultaneously. */
  stacks: { connected: boolean; address: string | null; balance: bigint };
  evm: {
    connected: boolean;
    address: string | null;
    balance: bigint;
    chain: ChainConfig | null;
  };
};

const Ctx = createContext<WalletContextValue | null>(null);

/** Balance is fairly stable; cache for 30s to avoid refetching on navigation. */
const BALANCE_TTL_MS = 30_000;

export function WalletProvider({ children }: { children: ReactNode }) {
  // ---------- Stacks state ----------
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
      // make @stacks/connect throw. Never let that crash the (app) tree —
      // fall back to disconnected state instead.
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

  // ---------- EVM state (wagmi) ----------
  //
  // These hooks are safe to call even when no EVM chains are enabled
  // because EvmProvider degrades to a pass-through — the wagmi context
  // stays default (disconnected). We defensively try/catch anyway so a
  // wagmi bug can never take the whole app down.
  let evmAddress: `0x${string}` | undefined;
  let evmChainId: number | undefined;
  let evmConnected = false;
  let evmDisconnect: (() => void) | undefined;
  try {
    const acc = useEvmAccount();
    evmAddress = acc.address;
    evmChainId = acc.chainId;
    evmConnected = acc.isConnected;
    const dc = useEvmDisconnect();
    evmDisconnect = dc.disconnect;
  } catch (e) {
    // Wagmi provider missing — treat as disconnected. Not fatal.
  }

  const evmChain = evmChainId ? getChainByEvmChainId(evmChainId) ?? null : null;

  // Balance via wagmi — reads either native or the configured ERC20 token
  // for the active chain. Falls back to native when no token is configured.
  const evmTokenAddress =
    evmChain?.kind === "evm" ? evmChain.currency.tokenAddress : undefined;
  let evmBalanceRaw: bigint = 0n;
  try {
    const bal = useEvmBalance({
      address: evmAddress,
      token: evmTokenAddress,
      chainId: evmChainId,
      query: { enabled: !!evmAddress },
    });
    evmBalanceRaw = bal.data?.value ?? 0n;
  } catch {
    evmBalanceRaw = 0n;
  }

  // ---------- Track "which did the user pick last" ----------
  const [lastActive, setLastActive] = useState<WalletKind>("stacks");
  useEffect(() => {
    if (stx.connected) setLastActive("stacks");
  }, [stx.connected, stx.address]);
  useEffect(() => {
    if (evmConnected) setLastActive("evm");
  }, [evmConnected, evmAddress]);

  // ---------- Compose the unified state ----------
  const value = useMemo<WalletContextValue>(() => {
    const activeIsEvm =
      lastActive === "evm" && evmConnected
        ? true
        : lastActive === "stacks" && stx.connected
          ? false
          : evmConnected && !stx.connected;

    const active: Pick<WalletState, "connected" | "address" | "balance" | "kind" | "chain"> =
      activeIsEvm
        ? {
            connected: evmConnected,
            address: evmAddress ?? null,
            balance: evmBalanceRaw,
            kind: "evm",
            chain: evmChain ?? defaultChain(),
          }
        : {
            connected: stx.connected,
            address: stx.address,
            balance: stx.balance,
            kind: "stacks",
            chain:
              CHAINS.find((c) => c.kind === "stacks" && c.enabled) ??
              defaultChain(),
          };

    return {
      ...active,
      loading: stx.loading,
      anyConnected: stx.connected || evmConnected,
      stacks: {
        connected: stx.connected,
        address: stx.address,
        balance: stx.balance,
      },
      evm: {
        connected: evmConnected,
        address: evmAddress ?? null,
        balance: evmBalanceRaw,
        chain: evmChain,
      },
      connect,
      disconnect: () => {
        // Disconnect whichever is currently active. If both are connected,
        // fall through and disconnect both.
        balanceCache.current.clear();
        try {
          disconnectWallet();
        } catch {}
        try {
          evmDisconnect?.();
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
  }, [
    stx,
    evmConnected,
    evmAddress,
    evmBalanceRaw,
    evmChain,
    lastActive,
    connect,
    refresh,
    evmDisconnect,
  ]);

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
