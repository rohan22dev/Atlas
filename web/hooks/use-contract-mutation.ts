"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWallet } from "./use-wallet";
import { submitSignedTransaction, ContractCallError } from "@/lib/contracts/tx";

interface ContractMutationOptions<TArgs> {
  /** Builds the unsigned transaction XDR for the given call arguments. */
  buildTx: (args: TArgs, publicKey: string) => Promise<string>;
  /** Query key prefixes to invalidate after a successful submission. */
  invalidateKeys?: (args: TArgs, publicKey: string) => unknown[][];
  successMessage?: (args: TArgs) => string;
  loadingMessage?: (args: TArgs) => string;
}

/**
 * Shared plumbing for every write action in the app: build the unsigned
 * transaction, prompt the connected wallet to sign it, submit it, and
 * surface progress via toasts. Every deposit/borrow/repay/withdraw/
 * liquidate/faucet mutation is a thin wrapper around this hook so the
 * sign-submit-poll-toast flow is implemented exactly once.
 */
export function useContractMutation<TArgs, TResult = unknown>(options: ContractMutationOptions<TArgs>) {
  const { address, signTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: TArgs) => {
      if (!address) throw new Error("Connect your wallet first");
      const toastId = toast.loading(options.loadingMessage?.(args) ?? "Preparing transaction...");
      try {
        const unsignedXdr = await options.buildTx(args, address);
        toast.loading("Confirm in your wallet...", { id: toastId });
        const signedXdr = await signTransaction(unsignedXdr);
        toast.loading("Submitting to Stellar Testnet...", { id: toastId });
        const result = await submitSignedTransaction<TResult>(signedXdr);
        toast.success(options.successMessage?.(args) ?? "Transaction confirmed", {
          id: toastId,
          description: `Hash: ${result.hash.slice(0, 12)}...`,
        });
        return result;
      } catch (err) {
        const message = err instanceof ContractCallError ? err.message : (err as Error).message;
        toast.error("Transaction failed", { id: toastId, description: message });
        throw err;
      }
    },
    onSuccess: (_result, args) => {
      if (!address) return;
      for (const key of options.invalidateKeys?.(args, address) ?? []) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
