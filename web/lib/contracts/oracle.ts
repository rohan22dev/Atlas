import { CONTRACTS } from "./config";
import { ORACLE_ERRORS } from "./errors";
import { i128ToScVal, symbolToScVal } from "./scval";
import { buildContractTx, readContract } from "./tx";
import type { AssetSymbol } from "@/types/protocol";

const ORACLE_ID = CONTRACTS.oracle;

export async function readPrice(asset: AssetSymbol): Promise<bigint> {
  return readContract<bigint>(ORACLE_ID, "get_price", [symbolToScVal(asset)], undefined, ORACLE_ERRORS);
}

export async function readUpdatedAt(asset: AssetSymbol): Promise<bigint> {
  return readContract<bigint>(ORACLE_ID, "get_updated_at", [symbolToScVal(asset)], undefined, ORACLE_ERRORS);
}

/** Admin-only. Pushes a new USD price (7-decimal fixed point) for `asset`. */
export async function buildUpdatePriceTx(
  adminPublicKey: string,
  asset: AssetSymbol,
  price: bigint,
): Promise<string> {
  return buildContractTx(
    ORACLE_ID,
    "update_price",
    [symbolToScVal(asset), i128ToScVal(price)],
    adminPublicKey,
    ORACLE_ERRORS,
  );
}
