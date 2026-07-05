import { useState, useCallback, useEffect } from "react";
import { connectWallet as connectStellarWallet, getWalletAddress, signTx } from "@/lib/stellar-wallet";
import { fetchXlmBalance, buildPaymentXdr, submitSignedTx } from "@/lib/stellar-sdk";

export interface UseWalletReturn {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  sendXlm: (to: string, amount: string) => Promise<{ hash: string }>;
}

export function useWallet(): UseWalletReturn {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async (currentAddress?: string) => {
    const targetAddress = currentAddress || address;
    if (!targetAddress) return;
    
    try {
      const bal = await fetchXlmBalance(targetAddress);
      setBalance(bal);
    } catch (err: any) {
      console.error("Failed to fetch balance:", err);
      // We don't necessarily want to set global error for balance fetch failures,
      // but we can set balance to "Error fetching"
      setBalance("Error");
    }
  }, [address]);

  // Check if already connected on mount
  useEffect(() => {
    async function checkConnection() {
      setIsLoading(true);
      try {
        const addr = await getWalletAddress();
        if (addr) {
          setAddress(addr);
          await refreshBalance(addr);
        }
      } catch (err) {
        console.error("Error checking wallet connection:", err);
      } finally {
        setIsLoading(false);
      }
    }
    checkConnection();
  }, [refreshBalance]);

  const connect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const addr = await connectStellarWallet();
      setAddress(addr);
      await refreshBalance(addr);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setBalance(null);
    setError(null);
  };

  const sendXlm = async (to: string, amount: string): Promise<{ hash: string }> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const xdr = await buildPaymentXdr(address, to, amount);
      const signedXdr = await signTx(xdr);
      const result = await submitSignedTx(signedXdr);
      
      // Refresh balance after successful transaction
      await refreshBalance(address);
      
      return result;
    } catch (err: any) {
      const errMsg = err.message || "Transaction failed";
      setError(errMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    address,
    balance,
    isConnected: !!address,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  };
}
