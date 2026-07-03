import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  accent?: "blue" | "purple" | "green" | "amber" | "red" | "none";
  isLoading?: boolean;
  className?: string;
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  blue: "text-atlas-blue",
  purple: "text-atlas-purple",
  green: "text-atlas-green",
  amber: "text-atlas-amber",
  red: "text-atlas-red",
  none: "text-foreground",
};

export function StatCard({ label, value, icon: Icon, hint, accent = "none", isLoading, className }: StatCardProps) {
  return (
    <div className={cn("atlas-card relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className={cn("size-4", accentMap[accent])} />}
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <div className={cn("mt-2 text-2xl font-semibold tracking-tight", accentMap[accent])}>{value}</div>
      )}
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
