"use client";

import { ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartShellProps {
  title: string;
  description?: string;
  height?: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactElement;
}

export function ChartShell({
  title,
  description,
  height = 260,
  isLoading,
  isEmpty,
  emptyMessage = "No data yet — this fills in as you use Atlas.",
  children,
}: ChartShellProps) {
  return (
    <Card className="atlas-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton style={{ height }} className="w-full" />
        ) : isEmpty ? (
          <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {children}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    fontSize: "12px",
  },
  labelStyle: { color: "var(--muted-foreground)" },
};
