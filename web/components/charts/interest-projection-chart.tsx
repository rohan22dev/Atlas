"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartShell, chartTooltipStyle } from "./chart-shell";
import { usePositionView, useProtocolConfig } from "@/hooks/use-position";
import { useWallet } from "@/hooks/use-wallet";
import { fixedToNumber } from "@/lib/format";

/** Forward-looking projection of interest accrual on the current debt
 * balance at the protocol's fixed 5% simple annual rate, assuming no
 * further borrows/repayments. Computed live from the connected wallet's
 * real on-chain debt -- not historical, and not fabricated. */
export function InterestProjectionChart({ userAddress }: { userAddress?: string | null }) {
  const { address: connected } = useWallet();
  const target = userAddress ?? connected;
  const { data: position, isLoading } = usePositionView(target);
  const { data: config } = useProtocolConfig();

  const rateBps = config ? Number(config.interest_rate_bps) : 500;
  const debt = position ? fixedToNumber(position.debt) : 0;

  const points = Array.from({ length: 13 }, (_, month) => {
    const interest = debt * (rateBps / 10_000) * (month / 12);
    return { month: `M${month}`, debt: debt + interest };
  });

  return (
    <ChartShell
      title="Projected Interest Growth"
      description={`Your current debt at a fixed ${(rateBps / 100).toFixed(2)}% simple annual rate, projected forward`}
      isLoading={isLoading}
      isEmpty={debt <= 0}
      emptyMessage="Borrow USDC to see your interest projection."
    >
      <AreaChart data={points}>
        <defs>
          <linearGradient id="interestGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--atlas-amber)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--atlas-amber)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={50} />
        <Tooltip {...chartTooltipStyle} formatter={(v) => [`${Number(v).toFixed(2)} USDC`, "Debt incl. interest"]} />
        <Area type="monotone" dataKey="debt" stroke="var(--atlas-amber)" fill="url(#interestGradient)" strokeWidth={2} />
      </AreaChart>
    </ChartShell>
  );
}
