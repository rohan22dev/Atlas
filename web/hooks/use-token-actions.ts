"use client";

import { useContractMutation } from "./use-contract-mutation";
import { balancesKey } from "./use-balances";
import { buildUsdcFaucetTx } from "@/lib/contracts/token";
import { buildUpdatePriceTx } from "@/lib/contracts/oracle";
import { oraclePriceKey } from "./use-oracle";
import type { AssetSymbol } from "@/types/protocol";

export function useUsdcFaucet() {
  return useContractMutation<void>({
    buildTx: (_args, publicKey) => buildUsdcFaucetTx(publicKey),
    loadingMessage: () => "Claiming test USDC...",
    successMessage: () => "Claimed 1,000 test USDC",
    invalidateKeys: (_args, publicKey) => [balancesKey(publicKey)],
  });
}

export function useUpdateOraclePrice() {
  return useContractMutation<{ asset: AssetSymbol; price: bigint }>({
    buildTx: ({ asset, price }, publicKey) => buildUpdatePriceTx(publicKey, asset, price),
    loadingMessage: ({ asset }) => `Updating ${asset} price...`,
    successMessage: ({ asset }) => `${asset} price updated`,
    invalidateKeys: ({ asset }) => [oraclePriceKey(asset)],
  });
}
