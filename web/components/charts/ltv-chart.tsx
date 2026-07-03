"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartShell, chartTooltipStyle } from "./chart-shell";
import { useVaultHistory } from "@/hooks/use-vault-history";
import { useOraclePrice } from "@/hooks/use-oracle";
import { PROTOCOL_PARAMS } from "@/lib/contracts/config";
import * as math from "@/lib/protocol-math";

function formatTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** LTV recomputed at each historical collateral/debt checkpoint using the
 * *current* oracle price (Atlas does not persist historical prices), so
 * this reflects "what your LTV would be today" at each past balance --
 * an approximation, not a precise historical series. */
export function LtvChart({ userAddress }: { userAddress?: string | null }) {
  const { data, isLoading } = useVaultHistory(userAddress);
  const { data: xlmPrice } = useOraclePrice("XLM");
  const { data: usdcPrice } = useOraclePrice("USDC");

  const points =
    xlmPrice && usdcPrice
      ? (data ?? []).map((p) => {
          const collateralValue = math.usdValue(p.collateral, xlmPrice);
          const debtValue = math.usdValue(p.debt, usdcPrice);
          const ltv = math.ltvBpsOf(collateralValue, debtValue);
          return { time: formatTime(p.time), ltv: Number(ltv) / 100 };
        })
      : [];

  return (
    <ChartShell
      title="LTV Over Time"
      description="Loan-to-value at each balance checkpoint, priced at today's oracle rate"
      isLoading={isLoading}
      isEmpty={points.length === 0}
    >
      <LineChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={[0, 100]}
        />
        <Tooltip {...chartTooltipStyle} formatter={(v) => [`${Number(v).toFixed(1)}%`, "LTV"]} />
        <ReferenceLine y={PROTOCOL_PARAMS.ltvBps / 100} stroke="var(--atlas-amber)" strokeDasharray="4 4" />
        <ReferenceLine y={PROTOCOL_PARAMS.liquidationThresholdBps / 100} stroke="var(--atlas-red)" strokeDasharray="4 4" />
        <Line type="stepAfter" dataKey="ltv" stroke="var(--atlas-green)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartShell>
  );
}
