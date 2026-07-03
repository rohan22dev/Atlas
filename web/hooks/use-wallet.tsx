"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { KitEventType } from "@creit.tech/stellar-wallets-kit";
import { ensureWalletKitInitialized, StellarWalletsKit } from "@/lib/wallet/kit";
import { NETWORK_PASSPHRASE } from "@/lib/contracts/config";

interface WalletContextValue {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const STORAGE_KEY = "atlas:wallet:auto-connect";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    ensureWalletKitInitialized();
    const unsubscribe = StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) => {
      setAddress(event.payload.address ?? null);
      setNetworkPassphrase(event.payload.networkPassphrase ?? null);
    });

    if (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1") {
      StellarWalletsKit.getAddress()
        .then((res) => setAddress(res.address))
        .catch(() => undefined);
    }

    return unsubscribe;
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const result = await StellarWalletsKit.authModal();
      setAddress(result.address);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await StellarWalletsKit.disconnect();
    setAddress(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const signTransaction = useCallback(
    async (xdr: string) => {
      if (!address) throw new Error("Wallet not connected");
      const result = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address,
      });
      return result.signedTxXdr;
    },
    [address],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      isConnected: Boolean(address),
      isConnecting,
      isCorrectNetwork: networkPassphrase === null || networkPassphrase === NETWORK_PASSPHRASE,
      connect,
      disconnect,
      signTransaction,
    }),
    [address, isConnecting, networkPassphrase, connect, disconnect, signTransaction],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
