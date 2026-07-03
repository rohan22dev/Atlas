"use client";

import { useQuery } from "@tanstack/react-query";
import { readAllUsers, readPositionView } from "@/lib/contracts/vault";
import { readTotalFees, readTreasuryBalance } from "@/lib/contracts/treasury";
import { readPrice } from "@/lib/contracts/oracle";

export interface ProtocolStats {
  totalCollateralUsd: bigint;
  totalDebtUsd: bigint;
  treasuryLiquidityUsdc: bigint;
  totalFeesUsdc: bigint;
  tvlUsd: bigint;
  utilizationBps: bigint;
  vaultCount: number;
  activeBorrowerCount: number;
  xlmPrice: bigint;
  usdcPrice: bigint;
}

async function fetchProtocolStats(): Promise<ProtocolStats> {
  const [users, treasuryLiquidityUsdc, totalFeesUsdc, xlmPrice, usdcPrice] = await Promise.all([
    readAllUsers(),
    readTreasuryBalance(),
    readTotalFees(),
    readPrice("XLM"),
    readPrice("USDC"),
  ]);

  const views = await Promise.all(
    users.map((owner) => readPositionView(owner).catch(() => null)),
  );

  let totalCollateralUsd = 0n;
  let totalDebtUsd = 0n;
  let activeBorrowerCount = 0;
  for (const view of views) {
    if (!view) continue;
    totalCollateralUsd += view.collateral_value_usd;
    totalDebtUsd += view.debt_value_usd;
    if (view.debt > 0n) activeBorrowerCount += 1;
  }

  const treasuryLiquidityUsd = (treasuryLiquidityUsdc * usdcPrice) / 10_000_000n;
  const tvlUsd = totalCollateralUsd + treasuryLiquidityUsd;
  const utilizationDenominator = totalDebtUsd + treasuryLiquidityUsd;
  const utilizationBps = utilizationDenominator > 0n ? (totalDebtUsd * 10_000n) / utilizationDenominator : 0n;

  return {
    totalCollateralUsd,
    totalDebtUsd,
    treasuryLiquidityUsdc,
    totalFeesUsdc,
    tvlUsd,
    utilizationBps,
    vaultCount: users.length,
    activeBorrowerCount,
    xlmPrice,
    usdcPrice,
  };
}

export function useProtocolStats() {
  return useQuery({
    queryKey: ["protocol", "stats"],
    queryFn: fetchProtocolStats,
    refetchInterval: 20_000,
  });
}
