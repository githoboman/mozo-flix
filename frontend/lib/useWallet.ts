"use client";

import { useEffect, useState, useCallback } from "react";
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

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: 0n,
    loading: true,
  });

  const refresh = useCallback(async () => {
    const connected = checkConnected();
    const address = connected ? getAddress() : null;
    let balance = 0n;
    if (address) balance = await getStxBalance(address);
    setState({ connected, address, balance, loading: false });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = useCallback(() => {
    openConnectModal(() => {
      // give the userSession a tick to settle, then refresh
      setTimeout(refresh, 200);
    });
  }, [refresh]);

  const disconnect = useCallback(() => {
    disconnectWallet();
    setState({
      connected: false,
      address: null,
      balance: 0n,
      loading: false,
    });
  }, []);

  return { ...state, connect, disconnect, refresh };
}
