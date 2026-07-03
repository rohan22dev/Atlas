"use client";

import { motion } from "framer-motion";
import { formatHealthFactor, healthFactorSeverity } from "@/lib/format";
import { cn } from "@/lib/utils";

const severityStyles = {
  safe: { bar: "bg-atlas-green", text: "text-atlas-green", label: "Healthy" },
  warning: { bar: "bg-atlas-amber", text: "text-atlas-amber", label: "At Risk" },
  danger: { bar: "bg-atlas-red", text: "text-atlas-red", label: "Liquidatable" },
};

/** Linear health-factor bar used on Vault Card / Vault Details. */
export function HealthMeter({ healthFactor, className }: { healthFactor: bigint; className?: string }) {
  const severity = healthFactorSeverity(healthFactor);
  const styles = severityStyles[severity];
  const num = Number(formatHealthFactor(healthFactor) === "∞" ? 3 : Number(formatHealthFactor(healthFactor).replace(",", "")));
  const pct = Math.max(4, Math.min(100, (num / 3) * 100));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Health Factor</span>
        <span className={cn("font-semibold tabular-nums", styles.text)}>{formatHealthFactor(healthFactor)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", styles.bar)}
        />
      </div>
      <div className={cn("text-xs font-medium", styles.text)}>{styles.label}</div>
    </div>
  );
}
