"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HealthMeter } from "@/components/shared/health-meter";
import { LiquidationBadge } from "@/components/shared/liquidation-badge";
import { ActionModal } from "@/components/vault/action-modal";
import { usePositionView, useProtocolConfig } from "@/hooks/use-position";
import { useWallet } from "@/hooks/use-wallet";
import { formatAmount, formatBps, formatUsd } from "@/lib/format";
import * as math from "@/lib/protocol-math";
import { ArrowDownToLine, ArrowUpFromLine, HandCoins, Banknote } from "lucide-react";
import Link from "next/link";

export function VaultCard() {
  const { address, isConnected, connect } = useWallet();
  const { data: position, isLoading } = usePositionView(address);
  const { data: config } = useProtocolConfig();

  const liqPrice =
    position && config
      ? math.liquidationPrice(position.collateral, position.debt_value_usd, config.liquidation_threshold_bps)
      : 0n;

  return (
    <Card className="atlas-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Vault</CardTitle>
        {position && <LiquidationBadge healthFactor={position.health_factor} />}
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Connect your wallet to view your vault.</p>
            <Button onClick={() => connect()}>Connect Wallet</Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <VaultStat label="Collateral" value={`${formatAmount(position?.collateral ?? 0n)} XLM`} />
              <VaultStat label="Debt" value={`${formatAmount(position?.debt ?? 0n)} USDC`} />
              <VaultStat label="LTV" value={formatBps(position?.ltv_bps ?? 0n)} />
              <VaultStat
                label="Liquidation Price"
                value={position && position.debt > 0n ? formatUsd(liqPrice) : "—"}
              />
              <VaultStat label="Interest Rate" value={formatBps(config?.interest_rate_bps ?? 500n)} />
            </div>

            <HealthMeter healthFactor={position?.health_factor ?? 0n} />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ActionModal
                action="deposit"
                trigger={
                  <Button variant="outline" className="gap-1.5">
                    <ArrowDownToLine className="size-4" /> Deposit
                  </Button>
                }
              />
              <ActionModal
                action="borrow"
                trigger={
                  <Button variant="outline" className="gap-1.5">
                    <HandCoins className="size-4" /> Borrow
                  </Button>
                }
              />
              <ActionModal
                action="repay"
                trigger={
                  <Button variant="outline" className="gap-1.5">
                    <Banknote className="size-4" /> Repay
                  </Button>
                }
              />
              <ActionModal
                action="withdraw"
                trigger={
                  <Button variant="outline" className="gap-1.5">
                    <ArrowUpFromLine className="size-4" /> Withdraw
                  </Button>
                }
              />
            </div>
            <Link href="/vault" className="block text-center text-xs text-atlas-blue hover:underline">
              View full vault details →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VaultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold tabular-nums">{value}</div>
    </div>
  );
}
