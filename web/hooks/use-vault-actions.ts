"use client";

import { useContractMutation } from "./use-contract-mutation";
import { balancesKey } from "./use-balances";
import { positionKey, positionViewKey } from "./use-position";
import { buildBorrowTx, buildDepositTx, buildRepayTx, buildWithdrawTx } from "@/lib/contracts/vault";
import { formatAmount } from "@/lib/format";

function invalidateVaultKeys(publicKey: string) {
  return [positionKey(publicKey), positionViewKey(publicKey), balancesKey(publicKey), ["vault", "all-users"]];
}

export function useDeposit() {
  return useContractMutation<{ amount: bigint }>({
    buildTx: ({ amount }, publicKey) => buildDepositTx(publicKey, amount),
    loadingMessage: () => "Depositing XLM...",
    successMessage: ({ amount }) => `Deposited ${formatAmount(amount)} XLM`,
    invalidateKeys: (_args, publicKey) => invalidateVaultKeys(publicKey),
  });
}

export function useWithdraw() {
  return useContractMutation<{ amount: bigint }>({
    buildTx: ({ amount }, publicKey) => buildWithdrawTx(publicKey, amount),
    loadingMessage: () => "Withdrawing collateral...",
    successMessage: ({ amount }) => `Withdrew ${formatAmount(amount)} XLM`,
    invalidateKeys: (_args, publicKey) => invalidateVaultKeys(publicKey),
  });
}

export function useBorrow() {
  return useContractMutation<{ amount: bigint }>({
    buildTx: ({ amount }, publicKey) => buildBorrowTx(publicKey, amount),
    loadingMessage: () => "Borrowing USDC...",
    successMessage: ({ amount }) => `Borrowed ${formatAmount(amount)} USDC`,
    invalidateKeys: (_args, publicKey) => invalidateVaultKeys(publicKey),
  });
}

export function useRepay() {
  return useContractMutation<{ amount: bigint }>({
    buildTx: ({ amount }, publicKey) => buildRepayTx(publicKey, amount),
    loadingMessage: () => "Repaying debt...",
    successMessage: ({ amount }) => `Repaid ${formatAmount(amount)} USDC`,
    invalidateKeys: (_args, publicKey) => invalidateVaultKeys(publicKey),
  });
}

export { invalidateVaultKeys };
