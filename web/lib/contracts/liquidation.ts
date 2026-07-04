import { CONTRACTS } from "./config";
import { LIQUIDATION_ERRORS, VAULT_ERRORS } from "./errors";
import { addressToScVal, i128ToScVal } from "./scval";
import { buildContractTx, readContract } from "./tx";

const LIQUIDATION_ID = CONTRACTS.liquidation;

export async function readIsLiquidatable(userAddress: string): Promise<boolean> {
  return readContract<boolean>(
    LIQUIDATION_ID,
    "is_liquidatable",
    [addressToScVal(userAddress)],
    undefined,
    LIQUIDATION_ERRORS,
  );
}

/**
 * Builds a `liquidate` transaction. The Liquidation/Vault contracts
 * require the caller to supply an explicit `repay_amount` covering the
 * position's current debt (see `contracts/liquidation`'s doc comment on
 * `liquidate` for why) rather than recomputing it live on-chain, since
 * debt accrues interest every second and Soroban's authorization is
 * bound to exact argument values. This reads the position's debt fresh
 * and pads it with a small buffer to absorb the few seconds of accrual
 * that can occur between building this transaction and it landing
 * on-chain; any unused buffer is left in the Treasury as protocol
 * liquidity rather than refunded.
 */
export async function buildLiquidateTx(liquidatorPublicKey: string, ownerAddress: string): Promise<string> {
  const debt = await readContract<bigint>(
    CONTRACTS.vault,
    "get_debt",
    [addressToScVal(ownerAddress)],
    liquidatorPublicKey,
    VAULT_ERRORS,
  );
  const buffer = debt / 1000n > 100n ? debt / 1000n : 100n; // ~0.1%, floor of 100 stroops
  const repayAmount = debt + buffer;

  return buildContractTx(
    LIQUIDATION_ID,
    "liquidate",
    [addressToScVal(liquidatorPublicKey), addressToScVal(ownerAddress), i128ToScVal(repayAmount)],
    liquidatorPublicKey,
    LIQUIDATION_ERRORS,
  );
}
