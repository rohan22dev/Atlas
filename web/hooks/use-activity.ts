"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchContractEvents } from "@/lib/contracts/events";
import { CONTRACTS } from "@/lib/contracts/config";

const ACTIVITY_CONTRACTS = [CONTRACTS.vault, CONTRACTS.liquidation];

export function useRecentActivity(userAddress?: string | null, limit = 50) {
  return useQuery({
    queryKey: ["activity", userAddress ?? "all"],
    queryFn: async () => {
      const events = await fetchContractEvents(ACTIVITY_CONTRACTS, 200);
      const filtered = userAddress
        ? events.filter((e) =>
            Object.values(e.data).some((v) => typeof v === "string" && v === userAddress),
          )
        : events;
      return filtered.slice(0, limit);
    },
    refetchInterval: 30_000,
  });
}
