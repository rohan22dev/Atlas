import { CONTRACTS } from "./config";
import { LIQUIDATION_ERRORS } from "./errors";
import { addressToScVal } from "./scval";
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

export async function buildLiquidateTx(liquidatorPublicKey: string, ownerAddress: string): Promise<string> {
  return buildContractTx(
    LIQUIDATION_ID,
    "liquidate",
    [addressToScVal(liquidatorPublicKey), addressToScVal(ownerAddress)],
    liquidatorPublicKey,
    LIQUIDATION_ERRORS,
  );
}
