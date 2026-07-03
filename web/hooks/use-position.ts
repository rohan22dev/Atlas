"use client";

import { useQuery } from "@tanstack/react-query";
import { readPosition, readPositionView, readProtocolConfig } from "@/lib/contracts/vault";
import { useWallet } from "./use-wallet";

export const positionKey = (address: string | null) => ["vault", "position", address];
export const positionViewKey = (address: string | null) => ["vault", "position-view", address];
export const protocolConfigKey = ["vault", "config"];

export function usePositionView(address?: string | null) {
  const { address: connected } = useWallet();
  const target = address ?? connected;
  return useQuery({
    queryKey: positionViewKey(target),
    queryFn: () => readPositionView(target as string),
    enabled: Boolean(target),
  });
}

export function usePosition(address?: string | null) {
  const { address: connected } = useWallet();
  const target = address ?? connected;
  return useQuery({
    queryKey: positionKey(target),
    queryFn: () => readPosition(target as string),
    enabled: Boolean(target),
  });
}

export function useProtocolConfig() {
  return useQuery({
    queryKey: protocolConfigKey,
    queryFn: readProtocolConfig,
    staleTime: 5 * 60_000,
    refetchInterval: false,
  });
}
