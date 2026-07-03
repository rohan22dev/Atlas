import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TxPreviewRowProps {
  label: string;
  before: React.ReactNode;
  after: React.ReactNode;
  afterClassName?: string;
}

export function TxPreviewRow({ label, before, after, afterClassName }: TxPreviewRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 font-medium tabular-nums">
        <span className="text-muted-foreground">{before}</span>
        <ArrowRight className="size-3 text-muted-foreground" />
        <span className={cn(afterClassName)}>{after}</span>
      </div>
    </div>
  );
}
