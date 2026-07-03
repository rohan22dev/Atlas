"use client";

import { useContractMutation } from "./use-contract-mutation";
import { balancesKey } from "./use-balances";
import { positionKey, positionViewKey } from "./use-position";
import { buildLiquidateTx } from "@/lib/contracts/liquidation";
import { truncateAddress } from "@/lib/format";

export function useLiquidate() {
  return useContractMutation<{ owner: string }>({
    buildTx: ({ owner }, publicKey) => buildLiquidateTx(publicKey, owner),
    loadingMessage: ({ owner }) => `Liquidating ${truncateAddress(owner)}...`,
    successMessage: ({ owner }) => `Liquidated vault ${truncateAddress(owner)}`,
    invalidateKeys: ({ owner }, publicKey) => [
      positionKey(owner),
      positionViewKey(owner),
      positionKey(publicKey),
      positionViewKey(publicKey),
      balancesKey(publicKey),
      ["liquidation", "liquidatable-vaults"],
    ],
  });
}
