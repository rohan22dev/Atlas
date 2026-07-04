"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthMeter } from "@/components/shared/health-meter";
import { LiquidationBadge } from "@/components/shared/liquidation-badge";
import { ActionModal } from "@/components/vault/action-modal";
import { CollateralHistoryChart, DebtHistoryChart } from "@/components/charts/collateral-debt-chart";
import { LtvChart } from "@/components/charts/ltv-chart";
import { InterestProjectionChart } from "@/components/charts/interest-projection-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { usePositionView, useProtocolConfig } from "@/hooks/use-position";
import { useWallet } from "@/hooks/use-wallet";
import { formatAmount, formatBps, formatUsd } from "@/lib/format";
import * as math from "@/lib/protocol-math";
import { ArrowDownToLine, ArrowUpFromLine, HandCoins, Banknote } from "lucide-react";

export default function VaultDetailsPage() {
  const { address, isConnected, connect } = useWallet();
  const { data: position } = usePositionView(address);
  const { data: config } = useProtocolConfig();

  const liqPrice =
    position && config
      ? math.liquidationPrice(position.collateral, position.debt_value_usd, config.liquidation_threshold_bps)
      : 0n;

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Vault</h1>
          <p className="text-sm text-muted-foreground">Full position detail and history.</p>
        </div>
        <Card className="atlas-card mx-auto max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">Connect your wallet to view your vault details.</p>
            <Button onClick={() => connect()}>Connect Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Vault</h1>
          <p className="text-sm text-muted-foreground">Full position detail and history.</p>
        </div>
        {position && <LiquidationBadge healthFactor={position.health_factor} className="text-sm" />}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <DetailStat label="Collateral" value={`${formatAmount(position?.collateral ?? 0n)} XLM`} />
        <DetailStat label="Collateral Value" value={formatUsd(position?.collateral_value_usd ?? 0n)} />
        <DetailStat label="Debt" value={`${formatAmount(position?.debt ?? 0n)} USDC`} />
        <DetailStat label="Debt Value" value={formatUsd(position?.debt_value_usd ?? 0n)} />
        <DetailStat label="LTV" value={formatBps(position?.ltv_bps ?? 0n)} />
        <DetailStat label="Liquidation Price" value={position && position.debt > 0n ? formatUsd(liqPrice) : "—"} />
      </div>

      <Card className="atlas-card">
        <CardHeader>
          <CardTitle className="text-base">Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <HealthMeter healthFactor={position?.health_factor ?? 0n} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ActionModal action="deposit" trigger={<Button variant="outline" className="gap-1.5"><ArrowDownToLine className="size-4" />Deposit</Button>} />
            <ActionModal action="borrow" trigger={<Button variant="outline" className="gap-1.5"><HandCoins className="size-4" />Borrow</Button>} />
            <ActionModal action="repay" trigger={<Button variant="outline" className="gap-1.5"><Banknote className="size-4" />Repay</Button>} />
            <ActionModal action="withdraw" trigger={<Button variant="outline" className="gap-1.5"><ArrowUpFromLine className="size-4" />Withdraw</Button>} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CollateralHistoryChart />
        <DebtHistoryChart />
        <LtvChart />
        <InterestProjectionChart />
      </div>

      <RecentActivity title="Vault Activity" />
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="atlas-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
