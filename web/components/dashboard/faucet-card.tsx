"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useBalances } from "@/hooks/use-balances";
import { useUsdcFaucet } from "@/hooks/use-token-actions";
import { formatAmount } from "@/lib/format";
import { Droplets, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function FaucetCard() {
  const { address, isConnected } = useWallet();
  const { data: balances } = useBalances();
  const faucet = useUsdcFaucet();

  if (!isConnected) return null;

  return (
    <Card className="atlas-card border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="size-4 text-atlas-blue" />
          Testnet Faucet
        </CardTitle>
        <CardDescription>Get test assets to try Atlas. This has no real value.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-muted-foreground">XLM Balance</div>
            <div className="font-semibold tabular-nums">{formatAmount(balances?.xlm ?? 0n)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">USDC Balance</div>
            <div className="font-semibold tabular-nums">{formatAmount(balances?.usdc ?? 0n)}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              if (!address) return;
              const t = toast.loading("Requesting XLM from Friendbot...");
              try {
                const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`);
                if (!res.ok) throw new Error(await res.text());
                toast.success("Received 10,000 testnet XLM", { id: t });
              } catch {
                toast.error("Friendbot only funds brand-new accounts", {
                  id: t,
                  description: "If your account already exists, you already have testnet XLM.",
                });
              }
            }}
          >
            <ExternalLink className="size-3.5" />
            Get XLM
          </Button>
          <Button size="sm" className="gap-1.5" disabled={faucet.isPending} onClick={() => faucet.mutate()}>
            <Droplets className="size-3.5" />
            {faucet.isPending ? "Claiming..." : "Get 1,000 USDC"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
