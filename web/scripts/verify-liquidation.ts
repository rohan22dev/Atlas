/**
 * One-off verification script exercising the full liquidation deliverable:
 * a borrower's vault becomes unhealthy after an admin oracle price crash,
 * and a second, unrelated wallet liquidates it for the collateral bonus --
 * all through the actual lib/contracts pipeline the frontend uses.
 *
 * The oracle price update itself is done via the `stellar` CLI (using the
 * already-configured `atlas-admin` identity) since this script never
 * touches any stored secret directly.
 *
 * Run with: npx tsx scripts/verify-liquidation.ts
 */
import { execSync } from "node:child_process";
import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { buildBorrowTx, buildDepositTx, readPositionView } from "../lib/contracts/vault";
import { buildLiquidateTx, readIsLiquidatable } from "../lib/contracts/liquidation";
import { buildUsdcFaucetTx, readUsdcBalance, readXlmBalance } from "../lib/contracts/token";
import { submitSignedTransaction } from "../lib/contracts/tx";
import { readPrice } from "../lib/contracts/oracle";
import { CONTRACTS } from "../lib/contracts/config";

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

function adminUpdatePrice(asset: string, price: string) {
  execSync(
    `stellar contract invoke --id ${CONTRACTS.oracle} --source-account atlas-admin --network testnet -- update_price --asset ${asset} --price ${price}`,
    { stdio: "pipe" },
  );
}

async function main() {
  const borrower = Keypair.random();
  const liquidator = Keypair.random();
  console.log(`Borrower:   ${borrower.publicKey()}`);
  console.log(`Liquidator: ${liquidator.publicKey()}`);

  await fundWithFriendbot(borrower.publicKey());
  await fundWithFriendbot(liquidator.publicKey());

  const originalXlmPrice = await readPrice("XLM");
  console.log(`\nOriginal XLM price: ${originalXlmPrice}`);

  console.log("\n1. Borrower deposits 1,000 XLM and borrows at max 60% LTV...");
  await signAndSubmit(await buildDepositTx(borrower.publicKey(), 1_000_0000000n), borrower);
  // At $0.10/XLM, 1000 XLM = $100 collateral value; max borrow = $60.
  await signAndSubmit(await buildBorrowTx(borrower.publicKey(), 60_0000000n), borrower);
  let view = await readPositionView(borrower.publicKey());
  console.log(`  collateral=${view.collateral} debt=${view.debt} health=${view.health_factor}`);

  console.log("\n2. Admin crashes the XLM price from $0.10 to $0.03...");
  adminUpdatePrice("XLM", "300000");
  view = await readPositionView(borrower.publicKey());
  const liquidatable = await readIsLiquidatable(borrower.publicKey());
  console.log(`  collateral=${view.collateral} debt=${view.debt} health=${view.health_factor} liquidatable=${liquidatable}`);
  if (!liquidatable) throw new Error("Expected vault to become liquidatable after price crash");

  console.log("\n3. Liquidator claims USDC from the faucet and liquidates the vault...");
  await signAndSubmit(await buildUsdcFaucetTx(liquidator.publicKey()), liquidator);
  const liquidatorXlmBefore = await readXlmBalance(liquidator.publicKey());
  const liquidatorUsdcBefore = await readUsdcBalance(liquidator.publicKey());
  await signAndSubmit(await buildLiquidateTx(liquidator.publicKey(), borrower.publicKey()), liquidator);

  const liquidatorXlmAfter = await readXlmBalance(liquidator.publicKey());
  const liquidatorUsdcAfter = await readUsdcBalance(liquidator.publicKey());
  view = await readPositionView(borrower.publicKey());

  console.log(`\n  Borrower vault after liquidation: collateral=${view.collateral} debt=${view.debt}`);
  console.log(`  Liquidator XLM: ${liquidatorXlmBefore} -> ${liquidatorXlmAfter} (+${liquidatorXlmAfter - liquidatorXlmBefore})`);
  console.log(`  Liquidator USDC: ${liquidatorUsdcBefore} -> ${liquidatorUsdcAfter} (${liquidatorUsdcAfter - liquidatorUsdcBefore})`);

  console.log("\n4. Restoring original XLM price...");
  adminUpdatePrice("XLM", originalXlmPrice.toString());

  if (view.debt !== 0n) throw new Error("Expected debt to be fully cleared after liquidation");
  if (liquidatorXlmAfter <= liquidatorXlmBefore) throw new Error("Expected liquidator to receive collateral");

  console.log("\nFull liquidation flow succeeded via the actual frontend lib/contracts pipeline.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
