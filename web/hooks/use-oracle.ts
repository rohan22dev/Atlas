"use client";

import { useQuery } from "@tanstack/react-query";
import { readPrice, readUpdatedAt } from "@/lib/contracts/oracle";
import type { AssetSymbol } from "@/types/protocol";

export const oraclePriceKey = (asset: AssetSymbol) => ["oracle", "price", asset];

export function useOraclePrice(asset: AssetSymbol) {
  return useQuery({
    queryKey: oraclePriceKey(asset),
    queryFn: () => readPrice(asset),
    refetchInterval: 15_000,
  });
}

export function useOracleUpdatedAt(asset: AssetSymbol) {
  return useQuery({
    queryKey: ["oracle", "updated-at", asset],
    queryFn: () => readUpdatedAt(asset),
    refetchInterval: 15_000,
  });
}
