"use client";

import { useState } from "react";
import { Copy, LogOut, Wallet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/hooks/use-wallet";
import { truncateAddress } from "@/lib/format";
import { toast } from "sonner";

export function WalletButton() {
  const { address, isConnected, isConnecting, isCorrectNetwork, connect, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  if (!isConnected) {
    return (
      <Button
        onClick={() => connect().catch((err) => toast.error("Could not connect wallet", { description: err.message }))}
        disabled={isConnecting}
        className="gap-2 bg-gradient-to-r from-atlas-blue to-atlas-purple text-white shadow-lg shadow-atlas-blue/20 hover:opacity-90"
      >
        <Wallet className="size-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 font-mono">
          <span className={`size-2 rounded-full ${isCorrectNetwork ? "bg-atlas-green" : "bg-atlas-red"}`} />
          {truncateAddress(address ?? "")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
          {address}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!isCorrectNetwork && (
          <div className="px-2 py-1.5 text-xs text-atlas-red">Wrong network — switch to Testnet</div>
        )}
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(address ?? "");
            setCopied(true);
            toast.success("Address copied");
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => disconnect()} className="text-atlas-red focus:text-atlas-red">
          <LogOut className="size-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
