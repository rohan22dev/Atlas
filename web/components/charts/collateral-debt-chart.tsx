"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartShell, chartTooltipStyle } from "./chart-shell";
import { useVaultHistory } from "@/hooks/use-vault-history";
import { fixedToNumber } from "@/lib/format";

function formatTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CollateralHistoryChart({ userAddress }: { userAddress?: string | null }) {
  const { data, isLoading } = useVaultHistory(userAddress);
  const points = (data ?? []).map((p) => ({ time: formatTime(p.time), collateral: fixedToNumber(p.collateral) }));

  return (
    <ChartShell title="Collateral History" description="XLM deposited over time" isLoading={isLoading} isEmpty={points.length === 0}>
      <AreaChart data={points}>
        <defs>
          <linearGradient id="collateralGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--atlas-blue)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--atlas-blue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={50} />
        <Tooltip {...chartTooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()} XLM`, "Collateral"]} />
        <Area type="monotone" dataKey="collateral" stroke="var(--atlas-blue)" fill="url(#collateralGradient)" strokeWidth={2} />
      </AreaChart>
    </ChartShell>
  );
}

export function DebtHistoryChart({ userAddress }: { userAddress?: string | null }) {
  const { data, isLoading } = useVaultHistory(userAddress);
  const points = (data ?? []).map((p) => ({ time: formatTime(p.time), debt: fixedToNumber(p.debt) }));

  return (
    <ChartShell title="Debt History" description="USDC borrowed over time" isLoading={isLoading} isEmpty={points.length === 0}>
      <AreaChart data={points}>
        <defs>
          <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--atlas-purple)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--atlas-purple)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={50} />
        <Tooltip {...chartTooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()} USDC`, "Debt"]} />
        <Area type="monotone" dataKey="debt" stroke="var(--atlas-purple)" fill="url(#debtGradient)" strokeWidth={2} />
      </AreaChart>
    </ChartShell>
  );
}
