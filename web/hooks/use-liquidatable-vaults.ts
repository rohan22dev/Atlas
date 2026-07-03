"use client";

import { useQuery } from "@tanstack/react-query";
import { readAllUsers, readPositionView } from "@/lib/contracts/vault";
import { HEALTH_FACTOR_ONE, PROTOCOL_PARAMS } from "@/lib/contracts/config";
import type { LiquidatableVault } from "@/types/protocol";

async function fetchAllVaults(): Promise<LiquidatableVault[]> {
  const users = await readAllUsers();
  const views = await Promise.all(
    users.map(async (owner) => {
      try {
        const view = await readPositionView(owner);
        return { owner, view };
      } catch {
        return null;
      }
    }),
  );

  return views
    .filter((v): v is { owner: string; view: Awaited<ReturnType<typeof readPositionView>> } => v !== null)
    .filter(({ view }) => view.debt > 0n)
    .map(({ owner, view }) => ({
      owner,
      collateral: view.collateral,
      debt: view.debt,
      healthFactor: view.health_factor,
      isLiquidatable: view.health_factor < HEALTH_FACTOR_ONE,
      estimatedBonus: (view.debt_value_usd * BigInt(PROTOCOL_PARAMS.liquidationBonusBps)) / 10_000n,
    }));
}

export function useAllVaults() {
  return useQuery({
    queryKey: ["vault", "all-vaults"],
    queryFn: fetchAllVaults,
    refetchInterval: 20_000,
  });
}

export function useLiquidatableVaults() {
  const query = useAllVaults();
  return {
    ...query,
    data: query.data?.filter((v) => v.isLiquidatable),
  };
}
