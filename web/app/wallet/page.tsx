"use client";

import { StellarWalletPanel } from "@/components/wallet/stellar-wallet-panel";

export default function WalletPage() {
  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Stellar Wallet — Freighter Integration</h1>
          <p className="text-muted-foreground text-lg">
            Connect your Freighter wallet to interact with the Stellar testnet.
          </p>
        </div>
        
        <StellarWalletPanel />
      </div>
    </div>
  );
}
