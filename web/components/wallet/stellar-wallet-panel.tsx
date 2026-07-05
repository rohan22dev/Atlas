"use client";

import { useEffect, useState } from "react";
import { detectFreighter } from "@/lib/stellar-wallet";
import { useWallet } from "@/hooks/use-stellar-wallet";
import { Button } from "@/components/ui/button";

export function StellarWalletPanel() {
  const [hasFreighter, setHasFreighter] = useState<boolean | null>(null);
  
  const {
    address,
    balance,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  } = useWallet();

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function checkFreighter() {
      const detected = await detectFreighter();
      setHasFreighter(detected);
    }
    checkFreighter();
  }, []);

  const handleConnect = async () => {
    try {
      await connect();
    } catch {
      // Error is handled in hook
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toAddress || !amount) return;
    
    setIsSending(true);
    setTxHash(null);
    setTxError(null);
    
    try {
      const result = await sendXlm(toAddress, amount);
      setTxHash(result.hash);
      setToAddress("");
      setAmount("");
    } catch (err: any) {
      setTxError(err.message || "Failed to send transaction");
    } finally {
      setIsSending(false);
    }
  };

  if (hasFreighter === null) {
    return <div className="p-4 border rounded-lg max-w-md mx-auto shadow-sm">Checking wallet...</div>;
  }

  if (!hasFreighter) {
    return (
      <div className="p-6 border rounded-lg max-w-md mx-auto shadow-sm space-y-4 text-center">
        <h2 className="text-xl font-bold">Freighter Wallet Not Detected</h2>
        <p className="text-muted-foreground">Please install the Freighter extension to continue.</p>
        <a 
          href="https://freighter.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block"
        >
          <Button>Install Freighter</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg max-w-md mx-auto shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Stellar Wallet</h2>
        {isConnected && (
          <Button variant="outline" size="sm" onClick={disconnect}>
            Disconnect
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error}
        </div>
      )}

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <Button onClick={handleConnect} disabled={isLoading} className="w-full">
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2 p-4 bg-secondary/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p className="font-mono text-sm break-all">{address}</p>
            </div>
            
            <div className="pt-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Balance</p>
                <p className="font-medium">{balance !== null ? `${balance} XLM` : "Loading..."}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => refreshBalance()} disabled={isLoading}>
                Refresh
              </Button>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            <h3 className="font-medium">Send XLM</h3>
            
            <div className="space-y-2">
              <label htmlFor="toAddress" className="text-sm font-medium">Destination Address</label>
              <input
                id="toAddress"
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="G..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">Amount (XLM)</label>
              <input
                id="amount"
                type="number"
                step="0.0000001"
                min="0.0000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            
            <Button type="submit" disabled={isSending || isLoading} className="w-full">
              {isSending ? "Sending..." : "Send XLM"}
            </Button>
          </form>

          {txHash && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-200">
              <p className="font-medium">Transaction sent!</p>
              <p className="break-all mt-1 text-xs">Hash: {txHash}</p>
              <a 
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium mt-2 inline-block"
              >
                View on Stellar Expert
              </a>
            </div>
          )}

          {txError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
              <p className="font-medium">Transaction Failed</p>
              <p className="mt-1 text-xs">{txError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
