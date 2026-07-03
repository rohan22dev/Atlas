"use client";

import { cn } from "@/lib/utils";

export interface AssetOption {
  symbol: string;
  name: string;
  icon: string;
  disabled?: boolean;
}

export const XLM_ASSET: AssetOption = { symbol: "XLM", name: "Stellar Lumens", icon: "🌐" };
export const USDC_ASSET: AssetOption = { symbol: "USDC", name: "Atlas USD Coin", icon: "💵" };
export const FUTURE_ASSETS: AssetOption[] = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", disabled: true },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", disabled: true },
];

interface AssetSelectorProps {
  options: AssetOption[];
  value: string;
  onChange: (symbol: string) => void;
  className?: string;
}

export function AssetSelector({ options, value, onChange, className }: AssetSelectorProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {options.map((asset) => (
        <button
          key={asset.symbol}
          type="button"
          disabled={asset.disabled}
          onClick={() => onChange(asset.symbol)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card/40 px-3 py-3 text-sm transition-all",
            value === asset.symbol && "border-atlas-blue bg-atlas-blue/10 shadow-sm shadow-atlas-blue/10",
            asset.disabled && "cursor-not-allowed opacity-40",
            !asset.disabled && value !== asset.symbol && "hover:border-border/80 hover:bg-secondary/60",
          )}
        >
          <span className="text-xl" aria-hidden>
            {asset.icon}
          </span>
          <span className="font-semibold">{asset.symbol}</span>
          {asset.disabled && <span className="text-[10px] text-muted-foreground">Coming soon</span>}
        </button>
      ))}
    </div>
  );
}
