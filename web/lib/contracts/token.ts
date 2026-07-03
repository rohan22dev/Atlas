import { CONTRACTS } from "./config";
import { addressToScVal, i128ToScVal, u32ToScVal } from "./scval";
import { buildContractTx, readContract } from "./tx";

export async function readTokenBalance(tokenId: string, ownerAddress: string): Promise<bigint> {
  return readContract<bigint>(tokenId, "balance", [addressToScVal(ownerAddress)], ownerAddress);
}

export async function readXlmBalance(ownerAddress: string): Promise<bigint> {
  return readTokenBalance(CONTRACTS.xlmToken, ownerAddress);
}

export async function readUsdcBalance(ownerAddress: string): Promise<bigint> {
  return readTokenBalance(CONTRACTS.usdcToken, ownerAddress);
}

export async function buildApproveTx(
  tokenId: string,
  ownerPublicKey: string,
  spender: string,
  amount: bigint,
  expirationLedger: number,
): Promise<string> {
  return buildContractTx(
    tokenId,
    "approve",
    [
      addressToScVal(ownerPublicKey),
      addressToScVal(spender),
      i128ToScVal(amount),
      u32ToScVal(expirationLedger),
    ],
    ownerPublicKey,
  );
}

/** Claims 1,000 test USDC from the permissionless faucet (1hr cooldown per address). */
export async function buildUsdcFaucetTx(userPublicKey: string): Promise<string> {
  return buildContractTx(
    CONTRACTS.usdcToken,
    "faucet",
    [addressToScVal(userPublicKey)],
    userPublicKey,
  );
}
