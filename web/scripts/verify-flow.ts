/**
 * One-off verification script (not part of the app or test suite) that
 * exercises the exact same lib/contracts pipeline the React hooks use --
 * buildDepositTx / buildBorrowTx / buildRepayTx / buildWithdrawTx and
 * submitSignedTransaction -- against the live Testnet deployment, using a
 * throwaway keypair generated fresh in-process (funded via the public
 * Friendbot endpoint, never touching any stored/CLI-managed identity).
 *
 * Run with: npx tsx scripts/verify-flow.ts
 */
import { Keypair } from "@stellar/stellar-sdk";
import { buildBorrowTx, buildDepositTx, buildRepayTx, buildWithdrawTx, readPositionView } from "../lib/contracts/vault";
import { submitSignedTransaction } from "../lib/contracts/tx";
import { readUsdcBalance, readXlmBalance } from "../lib/contracts/token";
import { buildUsdcFaucetTx } from "../lib/contracts/token";

async function fundWithFriendbot(publicKey: string) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) throw new Error(`Friendbot funding failed: ${await res.text()}`);
}

async function signAndSubmit<T>(unsignedXdr: string, keypair: Keypair): Promise<T | undefined> {
  const { TransactionBuilder, Networks } = await import("@stellar/stellar-sdk");
  const tx = TransactionBuilder.fromXDR(unsignedXdr, Networks.TESTNET);
  tx.sign(keypair);
  const result = await submitSignedTransaction<T>(tx.toXDR());
  console.log(`    tx hash: ${result.hash}`);
  return result.value;
}

async function main() {
  const user = Keypair.random();
  console.log(`Generated throwaway test wallet: ${user.publicKey()}`);

  console.log("Funding via Friendbot...");
  await fundWithFriendbot(user.publicKey());
  console.log(`  XLM balance: ${await readXlmBalance(user.publicKey())}`);

  console.log("\n1. Claiming test USDC from the permissionless faucet...");
  const faucetXdr = await buildUsdcFaucetTx(user.publicKey());
  await signAndSubmit(faucetXdr, user);
  console.log(`  USDC balance: ${await readUsdcBalance(user.publicKey())}`);

  console.log("\n2. Depositing 1,000 XLM as collateral...");
  const depositXdr = await buildDepositTx(user.publicKey(), 1_000_0000000n);
  await signAndSubmit(depositXdr, user);
  let view = await readPositionView(user.publicKey());
  console.log(`  collateral=${view.collateral} debt=${view.debt} health=${view.health_factor}`);

  console.log("\n3. Borrowing 20 USDC...");
  const borrowXdr = await buildBorrowTx(user.publicKey(), 20_0000000n);
  await signAndSubmit(borrowXdr, user);
  view = await readPositionView(user.publicKey());
  console.log(`  collateral=${view.collateral} debt=${view.debt} health=${view.health_factor}`);

  console.log("\n4. Repaying 5 USDC...");
  const repayXdr = await buildRepayTx(user.publicKey(), 5_0000000n);
  await signAndSubmit(repayXdr, user);
  view = await readPositionView(user.publicKey());
  console.log(`  collateral=${view.collateral} debt=${view.debt} health=${view.health_factor}`);

  console.log("\n5. Withdrawing 100 XLM collateral...");
  const withdrawXdr = await buildWithdrawTx(user.publicKey(), 100_0000000n);
  await signAndSubmit(withdrawXdr, user);
  view = await readPositionView(user.publicKey());
  console.log(`  collateral=${view.collateral} debt=${view.debt} health=${view.health_factor}`);

  console.log("\nAll steps succeeded via the actual frontend lib/contracts pipeline.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
