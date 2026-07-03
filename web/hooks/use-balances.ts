"use client";

import { useQuery } from "@tanstack/react-query";
import { readUsdcBalance, readXlmBalance } from "@/lib/contracts/token";
import { useWallet } from "./use-wallet";

export const balancesKey = (address: string | null) => ["balances", address];

export function useBalances(address?: string | null) {
  const { address: connected } = useWallet();
  const target = address ?? connected;

  return useQuery({
    queryKey: balancesKey(target),
    queryFn: async () => {
      const [xlm, usdc] = await Promise.all([
        readXlmBalance(target as string),
        readUsdcBalance(target as string),
      ]);
      return { xlm, usdc };
    },
    enabled: Boolean(target),
  });
}
