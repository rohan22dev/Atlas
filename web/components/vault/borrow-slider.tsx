"use client";

import { Slider } from "@/components/ui/slider";
import { formatAmount } from "@/lib/format";

interface BorrowSliderProps {
  amount: bigint;
  max: bigint;
  onChange: (amount: bigint) => void;
  step?: bigint;
  unit?: string;
}

export function BorrowSlider({ amount, max, onChange, unit = "USDC" }: BorrowSliderProps) {
  const maxNum = max > 0n ? Number(max) : 1;
  const value = Number(amount);

  return (
    <div className="space-y-3">
      <Slider
        value={[Math.min(value, maxNum)]}
        max={maxNum}
        step={Math.max(1, Math.floor(maxNum / 1000))}
        onValueChange={(v) => {
          const num = Array.isArray(v) ? v[0] : v;
          onChange(BigInt(Math.round(num)));
        }}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>0 {unit}</span>
        <div className="flex gap-1.5">
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => onChange(BigInt(Math.floor(maxNum * pct)))}
              className="rounded-md border border-border px-2 py-0.5 font-medium text-foreground/80 transition-colors hover:border-atlas-blue hover:text-atlas-blue"
            >
              {pct === 1 ? "MAX" : `${pct * 100}%`}
            </button>
          ))}
        </div>
        <span>
          {formatAmount(max)} {unit}
        </span>
      </div>
    </div>
  );
}
