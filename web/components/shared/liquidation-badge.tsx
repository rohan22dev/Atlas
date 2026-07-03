import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { healthFactorSeverity } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LiquidationBadge({ healthFactor, className }: { healthFactor: bigint; className?: string }) {
  const severity = healthFactorSeverity(healthFactor);

  if (severity === "danger") {
    return (
      <Badge className={cn("gap-1 border-atlas-red/30 bg-atlas-red/10 text-atlas-red", className)}>
        <AlertTriangle className="size-3" />
        Liquidatable
      </Badge>
    );
  }
  if (severity === "warning") {
    return (
      <Badge className={cn("gap-1 border-atlas-amber/30 bg-atlas-amber/10 text-atlas-amber", className)}>
        <ShieldAlert className="size-3" />
        At Risk
      </Badge>
    );
  }
  return (
    <Badge className={cn("gap-1 border-atlas-green/30 bg-atlas-green/10 text-atlas-green", className)}>
      <ShieldCheck className="size-3" />
      Healthy
    </Badge>
  );
}
