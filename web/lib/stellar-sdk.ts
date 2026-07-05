import * as StellarSdk from "@stellar/stellar-sdk";
import { HORIZON_TESTNET_URL, STELLAR_TESTNET_PASSPHRASE } from "./stellar-wallet";

export async function fetchXlmBalance(address: string): Promise<string> {
  const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET_URL);
  try {
    const account = await server.loadAccount(address);
    const nativeBalance = account.balances.find((b) => b.asset_type === "native");
    return nativeBalance ? nativeBalance.balance : "0";
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return "0 (account not funded)";
    }
    throw new Error(error?.response?.data?.title || error.message || "Failed to fetch balance");
  }
}

export async function buildPaymentXdr(from: string, to: string, amount: string): Promise<string> {
  const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET_URL);
  
  try {
    const account = await server.loadAccount(from);
    
    // Convert to string just in case
    const amountString = String(amount);
    
    const transaction = new StellarSdk.TransactionBuilder(account, { 
      fee: StellarSdk.BASE_FEE, 
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE 
    })
      .addOperation(StellarSdk.Operation.payment({ 
        destination: to, 
        asset: StellarSdk.Asset.native(), 
        amount: amountString 
      }))
      .setTimeout(30)
      .build();
      
    return transaction.toXDR();
  } catch (error: any) {
    throw new Error(error?.response?.data?.title || error.message || "Failed to build transaction");
  }
}

export async function submitSignedTx(signedXdr: string): Promise<{ hash: string }> {
  const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET_URL);
  
  try {
    const transaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, STELLAR_TESTNET_PASSPHRASE);
    const response = await server.submitTransaction(transaction as any);
    return { hash: response.hash };
  } catch (error: any) {
    if (error?.response?.data?.extras?.result_codes) {
      throw new Error(`Transaction failed: ${JSON.stringify(error.response.data.extras.result_codes)}`);
    }
    throw new Error(error?.response?.data?.title || error.message || "Failed to submit transaction");
  }
}
