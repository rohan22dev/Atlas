/** Mirrors each contract's `#[contracterror]` enum so raw error codes
 * surfaced from the Soroban host can be translated into readable text. */

export const VAULT_ERRORS: Record<number, string> = {
  1: "Vault is not initialized",
  2: "Vault is already initialized",
  3: "Amount must be greater than zero",
  4: "No vault position found for this address",
  5: "This would exceed the 60% maximum loan-to-value ratio",
  6: "Insufficient collateral in this vault",
  7: "Insufficient outstanding debt",
  8: "This action would leave the vault unhealthy (below the 80% liquidation threshold)",
  9: "This vault is not eligible for liquidation",
  10: "Caller is not the registered liquidation contract",
  11: "Liquidation contract has not been registered yet",
  12: "Amount overflow",
  13: "Repay amount exceeds outstanding debt",
  14: "Repayment amount does not cover the position's outstanding debt",
};

export const ORACLE_ERRORS: Record<number, string> = {
  1: "Oracle is not initialized",
  2: "Oracle is already initialized",
  3: "Caller is not the oracle admin",
  4: "Price must be greater than zero",
  5: "No price has been set for this asset",
};

export const TREASURY_ERRORS: Record<number, string> = {
  1: "Treasury is not initialized",
  2: "Treasury is already initialized",
  3: "Caller is not the treasury admin",
  4: "Caller is not the registered vault contract",
  5: "Vault contract has not been registered yet",
  6: "Amount must be greater than zero",
  7: "Treasury has insufficient liquidity for this request",
};

export const LIQUIDATION_ERRORS: Record<number, string> = {
  1: "Liquidation contract is not initialized",
  2: "Liquidation contract is already initialized",
  3: "This vault is healthy and cannot be liquidated",
  4: "This vault has no outstanding debt",
  5: "The repayment amount does not cover the vault's current debt",
};

export const TOKEN_ERRORS: Record<number, string> = {};

export function describeContractError(code: number, map: Record<number, string>): string | undefined {
  return map[code];
}

/** Extracts a `Error(Contract, #N)` code from a raw Soroban error string. */
export function extractContractErrorCode(message: string): number | undefined {
  const match = message.match(/Error\(Contract, #(\d+)\)/);
  return match ? Number(match[1]) : undefined;
}
