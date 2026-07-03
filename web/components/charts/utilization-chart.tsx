"use client";

import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { ChartShell, chartTooltipStyle } from "./chart-shell";
import { useProtocolStats } from "@/hooks/use-protocol-stats";

export function UtilizationChart() {
  const { data, isLoading } = useProtocolStats();

  const utilizationPct = data ? Number(data.utilizationBps) / 100 : 0;
  const points = [
    { name: "Borrowed", value: utilizationPct, fill: "var(--atlas-purple)" },
    { name: "Available", value: Math.max(0, 100 - utilizationPct), fill: "var(--atlas-green)" },
  ];

  return (
    <ChartShell
      title="Borrow Utilization"
      description="Share of treasury liquidity currently borrowed"
      isLoading={isLoading}
      height={200}
    >
      <BarChart data={points} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={70} />
        <Tooltip {...chartTooltipStyle} formatter={(v) => `${Number(v).toFixed(1)}%`} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
          {points.map((p) => (
            <Cell key={p.name} fill={p.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartShell>
  );
}
