import { CONTRACTS } from "./config";
import { TREASURY_ERRORS } from "./errors";
import { readContract } from "./tx";

const TREASURY_ID = CONTRACTS.treasury;

export async function readTreasuryBalance(): Promise<bigint> {
  return readContract<bigint>(TREASURY_ID, "get_balance", [], undefined, TREASURY_ERRORS);
}

export async function readTotalFees(): Promise<bigint> {
  return readContract<bigint>(TREASURY_ID, "get_total_fees", []);
}
