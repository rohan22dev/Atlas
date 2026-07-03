import { CONTRACTS } from "./config";
import { VAULT_ERRORS } from "./errors";
import { addressToScVal, i128ToScVal } from "./scval";
import { buildContractTx, readContract } from "./tx";
import type { Position, PositionView, ProtocolConfig } from "@/types/protocol";

const VAULT_ID = CONTRACTS.vault;

export async function readPosition(userAddress: string): Promise<Position> {
  return readContract<Position>(VAULT_ID, "get_position", [addressToScVal(userAddress)], userAddress);
}

export async function readPositionView(userAddress: string): Promise<PositionView> {
  return readContract<PositionView>(
    VAULT_ID,
    "get_position_view",
    [addressToScVal(userAddress)],
    userAddress,
    VAULT_ERRORS,
  );
}

export async function readHealthFactor(userAddress: string): Promise<bigint> {
  return readContract<bigint>(
    VAULT_ID,
    "calculate_health",
    [addressToScVal(userAddress)],
    userAddress,
    VAULT_ERRORS,
  );
}

export async function readDebt(userAddress: string): Promise<bigint> {
  return readContract<bigint>(VAULT_ID, "get_debt", [addressToScVal(userAddress)], userAddress);
}

export async function readProtocolConfig(): Promise<ProtocolConfig> {
  return readContract<ProtocolConfig>(VAULT_ID, "get_config", [], undefined, VAULT_ERRORS);
}

export async function readAllUsers(): Promise<string[]> {
  return readContract<string[]>(VAULT_ID, "get_all_users", []);
}

export async function buildDepositTx(userPublicKey: string, amount: bigint): Promise<string> {
  return buildContractTx(
    VAULT_ID,
    "deposit",
    [addressToScVal(userPublicKey), i128ToScVal(amount)],
    userPublicKey,
    VAULT_ERRORS,
  );
}

export async function buildWithdrawTx(userPublicKey: string, amount: bigint): Promise<string> {
  return buildContractTx(
    VAULT_ID,
    "withdraw",
    [addressToScVal(userPublicKey), i128ToScVal(amount)],
    userPublicKey,
    VAULT_ERRORS,
  );
}

export async function buildBorrowTx(userPublicKey: string, amount: bigint): Promise<string> {
  return buildContractTx(
    VAULT_ID,
    "borrow",
    [addressToScVal(userPublicKey), i128ToScVal(amount)],
    userPublicKey,
    VAULT_ERRORS,
  );
}

export async function buildRepayTx(userPublicKey: string, amount: bigint): Promise<string> {
  return buildContractTx(
    VAULT_ID,
    "repay",
    [addressToScVal(userPublicKey), i128ToScVal(amount)],
    userPublicKey,
    VAULT_ERRORS,
  );
}
