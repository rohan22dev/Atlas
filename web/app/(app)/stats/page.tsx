"use client";

import { StatCard } from "@/components/shared/stat-card";
import { TvlBreakdownChart } from "@/components/charts/tvl-breakdown-chart";
import { UtilizationChart } from "@/components/charts/utilization-chart";
import { useProtocolStats } from "@/hooks/use-protocol-stats";
import { formatBps, formatUsd } from "@/lib/format";
import { PROTOCOL_PARAMS } from "@/lib/contracts/config";
import { Landmark, Users, TrendingUp, Percent, Coins, ShieldCheck } from "lucide-react";

export default function StatsPage() {
  const { data: stats, isLoading } = useProtocolStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Protocol Stats</h1>
        <p className="text-sm text-muted-foreground">Live on-chain metrics for the Atlas protocol on Stellar Testnet.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Value Locked" value={stats ? formatUsd(stats.tvlUsd) : "$0"} icon={Landmark} accent="blue" isLoading={isLoading} />
        <StatCard label="Total Borrowed" value={stats ? formatUsd(stats.totalDebtUsd) : "$0"} icon={TrendingUp} accent="purple" isLoading={isLoading} />
        <StatCard label="Total Vaults" value={stats?.vaultCount ?? 0} icon={Users} accent="none" isLoading={isLoading} />
        <StatCard label="Active Borrowers" value={stats?.activeBorrowerCount ?? 0} icon={Users} accent="none" isLoading={isLoading} />
        <StatCard label="Treasury Liquidity" value={stats ? formatUsd(stats.treasuryLiquidityUsdc) : "$0"} icon={Coins} accent="green" isLoading={isLoading} />
        <StatCard label="Protocol Fees Earned" value={stats ? formatUsd(stats.totalFeesUsdc) : "$0"} icon={Percent} accent="amber" isLoading={isLoading} />
        <StatCard label="Borrow Utilization" value={stats ? formatBps(stats.utilizationBps) : "0%"} icon={TrendingUp} accent="none" isLoading={isLoading} />
        <StatCard label="Max LTV / Liq. Threshold" value={`${formatBps(PROTOCOL_PARAMS.ltvBps)} / ${formatBps(PROTOCOL_PARAMS.liquidationThresholdBps)}`} icon={ShieldCheck} accent="none" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TvlBreakdownChart />
        <UtilizationChart />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="XLM Price" value={stats ? formatUsd(stats.xlmPrice) : "—"} accent="blue" isLoading={isLoading} />
        <StatCard label="USDC Price" value={stats ? formatUsd(stats.usdcPrice) : "—"} accent="green" isLoading={isLoading} />
        <StatCard label="Liquidation Bonus" value={formatBps(PROTOCOL_PARAMS.liquidationBonusBps)} accent="amber" isLoading={isLoading} />
      </div>
    </div>
  );
}
