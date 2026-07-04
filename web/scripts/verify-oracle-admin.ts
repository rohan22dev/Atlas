/**
 * One-off verification script exercising admin-authenticated oracle price
 * updates through the actual frontend pipeline (lib/contracts/tx.ts's
 * buildContractTx + submitSignedTransaction -- the exact primitives
 * lib/contracts/oracle.ts's buildUpdatePriceTx is built on) -- the code
 * path the OracleAdminPanel component in the Liquidation Market page
 * calls.
 *
 * This deploys and initializes a throwaway Oracle contract instance
 * whose admin is a keypair generated fresh in-process, so it never
 * touches the live deployment's admin control (`atlas-admin`) at all --
 * only its wasm bytecode is reused, and `atlas-admin` is used solely to
 * pay the one-time deployment fee, which does not grant it any role in
 * the new instance.
 *
 * Run with: npx tsx scripts/verify-oracle-admin.ts
 */
import { execSync } from "node:child_process";
import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { buildContractTx, submitSignedTransaction, readContract } from "../lib/contracts/tx";
import { addressToScVal, i128ToScVal, symbolToScVal } from "../lib/contracts/scval";

async function fundWithFriendbot(publicKey: string) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) throw new Error(`Friendbot funding failed: ${await res.text()}`);
}

async function signAndSubmit<T>(unsignedXdr: string, keypair: Keypair): Promise<T | undefined> {
  const tx = TransactionBuilder.fromXDR(unsignedXdr, Networks.TESTNET);
  tx.sign(keypair);
  const result = await submitSignedTransaction<T>(tx.toXDR());
  console.log(`    tx hash: ${result.hash}`);
  return result.value;
}

function deployThrowawayOracle(): string {
  const output = execSync(
    "stellar contract deploy --wasm target/wasm32v1-none/release/atlas_oracle.wasm --source-account atlas-admin --network testnet",
    { stdio: "pipe", cwd: "../" },
  ).toString();
  const contractId = output.trim().split("\n").pop()!.trim();
  if (!contractId.startsWith("C")) throw new Error(`Unexpected deploy output: ${output}`);
  return contractId;
}

async function main() {
  console.log("Deploying a throwaway Oracle instance (atlas-admin only pays the fee, grants no role)...");
  const oracleId = deployThrowawayOracle();
  console.log(`  Throwaway Oracle contract id: ${oracleId}`);

  const testAdmin = Keypair.random();
  console.log(`\nGenerated fresh admin keypair: ${testAdmin.publicKey()}`);
  await fundWithFriendbot(testAdmin.publicKey());

  console.log("\n1. Initializing the throwaway Oracle with the fresh keypair as admin...");
  const initXdr = await buildContractTx(oracleId, "initialize", [addressToScVal(testAdmin.publicKey())], testAdmin.publicKey());
  await signAndSubmit(initXdr, testAdmin);

  console.log("\n2. Updating XLM price to $0.15 via the same pipeline buildUpdatePriceTx uses...");
  const updateXdr = await buildContractTx(
    oracleId,
    "update_price",
    [symbolToScVal("XLM"), i128ToScVal(1_500_000n)],
    testAdmin.publicKey(),
  );
  await signAndSubmit(updateXdr, testAdmin);

  const price = await readContract<bigint>(oracleId, "get_price", [symbolToScVal("XLM")], testAdmin.publicKey());
  console.log(`  Price read back: ${price}`);
  if (price !== 1_500_000n) throw new Error(`Expected price 1500000, got ${price}`);

  console.log("\n3. Confirming a non-admin caller is rejected...");
  const impostor = Keypair.random();
  await fundWithFriendbot(impostor.publicKey());
  let rejected = false;
  try {
    const impostorXdr = await buildContractTx(
      oracleId,
      "update_price",
      [symbolToScVal("XLM"), i128ToScVal(9_000_000n)],
      impostor.publicKey(),
    );
    await signAndSubmit(impostorXdr, impostor);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Expected non-admin price update to be rejected, but it succeeded!");
  console.log("  Correctly rejected.");

  console.log("\nAdmin-gated oracle price update verified via the actual frontend build/sign/submit pipeline,");
  console.log("entirely isolated from the live deployment -- no state on the real Oracle was touched.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
