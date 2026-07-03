"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  symbol: string;
  balance?: bigint;
  balanceLabel?: string;
  onMax?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export function AmountInput({
  value,
  onChange,
  symbol,
  balance,
  balanceLabel = "Available",
  onMax,
  className,
  autoFocus,
}: AmountInputProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-secondary/30 p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            const v = e.target.value;
            if (/^\d*\.?\d*$/.test(v)) onChange(v);
          }}
          className="border-none bg-transparent p-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
        />
        <span className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold">{symbol}</span>
      </div>
      {balance !== undefined && (
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {balanceLabel}: {formatAmount(balance)} {symbol}
          </span>
          {onMax && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-atlas-blue hover:text-atlas-blue/80"
              onClick={onMax}
            >
              MAX
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
