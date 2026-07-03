"use client";

import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { ChartShell, chartTooltipStyle } from "./chart-shell";
import { useProtocolStats } from "@/hooks/use-protocol-stats";
import { fixedToNumber } from "@/lib/format";

export function TvlBreakdownChart() {
  const { data, isLoading } = useProtocolStats();

  const points = data
    ? [
        { name: "Collateral (XLM)", value: fixedToNumber(data.totalCollateralUsd), color: "var(--atlas-blue)" },
        { name: "Treasury Liquidity (USDC)", value: fixedToNumber(data.treasuryLiquidityUsdc), color: "var(--atlas-green)" },
      ].filter((p) => p.value > 0)
    : [];

  return (
    <ChartShell title="Total Value Locked" description="Composition of protocol TVL" isLoading={isLoading} isEmpty={points.length === 0}>
      <PieChart>
        <Pie data={points} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
          {points.map((p) => (
            <Cell key={p.name} fill={p.color} stroke="var(--card)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip {...chartTooltipStyle} formatter={(v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartShell>
  );
}
