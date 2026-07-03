"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PROTOCOL_PARAMS } from "@/lib/contracts/config";

/**
 * Semi-circular gauge showing current LTV against the protocol's max LTV
 * (60%) and liquidation threshold (80%). Used in the Borrow flow for live
 * feedback as the user drags the amount slider.
 */
export function RiskMeter({ ltvBps, className }: { ltvBps: number; className?: string }) {
  const ltvPct = Math.max(0, Math.min(100, ltvBps / 100));
  const maxLtvPct = PROTOCOL_PARAMS.ltvBps / 100;
  const liqPct = PROTOCOL_PARAMS.liquidationThresholdBps / 100;

  const radius = 80;
  const circumference = Math.PI * radius;
  const progress = (ltvPct / 100) * circumference;

  const color = ltvPct >= liqPct ? "var(--atlas-red)" : ltvPct >= maxLtvPct ? "var(--atlas-amber)" : "var(--atlas-green)";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg viewBox="0 0 200 110" className="w-full max-w-[220px]">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--border)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <motion.path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <text x="100" y="90" textAnchor="middle" className="fill-foreground text-2xl font-semibold">
          {ltvPct.toFixed(0)}%
        </text>
        <text x="100" y="106" textAnchor="middle" className="fill-muted-foreground text-[10px]">
          LTV
        </text>
      </svg>
      <div className="flex w-full max-w-[220px] justify-between text-[10px] text-muted-foreground">
        <span>0%</span>
        <span>Max {maxLtvPct}%</span>
        <span>Liq. {liqPct}%</span>
      </div>
    </div>
  );
}
