"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchContractEvents } from "@/lib/contracts/events";
import { CONTRACTS } from "@/lib/contracts/config";
import { useWallet } from "./use-wallet";

export interface VaultHistoryPoint {
  time: string;
  ledger: number;
  event: string;
  collateral: bigint;
  debt: bigint;
}

async function fetchVaultHistory(userAddress: string): Promise<VaultHistoryPoint[]> {
  const events = await fetchContractEvents([CONTRACTS.vault], 200);
  const mine = events
    .filter((e) => Object.values(e.data).includes(userAddress))
    .sort((a, b) => a.ledger - b.ledger);

  let collateral = 0n;
  let debt = 0n;
  const points: VaultHistoryPoint[] = [];

  for (const e of mine) {
    switch (e.eventName) {
      case "deposited":
      case "withdrawn":
        collateral = e.data.new_collateral as bigint;
        break;
      case "borrowed":
      case "repaid":
        debt = e.data.new_debt as bigint;
        break;
      case "seized":
        debt = 0n;
        collateral -= (e.data.collateral_seized as bigint) ?? 0n;
        break;
      default:
        continue;
    }
    points.push({ time: e.closedAt, ledger: e.ledger, event: e.eventName, collateral, debt });
  }

  return points;
}

export function useVaultHistory(userAddress?: string | null) {
  const { address: connected } = useWallet();
  const target = userAddress ?? connected;
  return useQuery({
    queryKey: ["vault-history", target],
    queryFn: () => fetchVaultHistory(target as string),
    enabled: Boolean(target),
    refetchInterval: 30_000,
  });
}
