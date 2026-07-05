import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";
export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

export async function detectFreighter(): Promise<boolean> {
  try {
    const result = await isConnected();
    return !!result.isConnected;
  } catch (error) {
    console.error("Error detecting Freighter:", error);
    return false;
  }
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const allowedResult = await isAllowed();
    const allowed = typeof allowedResult === "object" && allowedResult !== null ? (allowedResult as any).isAllowed : allowedResult;
    if (!allowed) {
      return null;
    }
    const address = await getAddress();
    if (typeof address === "object" && address !== null) {
      // In some older versions, it returns an object like { address: string }
      if ("address" in address) return (address as any).address;
      if ("error" in address) throw new Error((address as any).error);
    }
    return address as string;
  } catch (error) {
    console.error("Error getting wallet address:", error);
    return null;
  }
}

export async function connectWallet(): Promise<string> {
  try {
    let allowedResult = await isAllowed();
    let allowed = typeof allowedResult === "object" && allowedResult !== null ? (allowedResult as any).isAllowed : allowedResult;
    if (!allowed) {
      const access = await requestAccess();
      // Access might return address or just string
      if (typeof access === "string") {
        // If it's a string, it might be the address or an error
      }
      allowedResult = await isAllowed();
      allowed = typeof allowedResult === "object" && allowedResult !== null ? (allowedResult as any).isAllowed : allowedResult;
      if (!allowed) {
        throw new Error("Wallet access denied");
      }
    }
    
    const address = await getWalletAddress();
    if (!address) {
      throw new Error("Failed to get wallet address after granting access.");
    }
    return address;
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
}

export async function signTx(xdr: string): Promise<string> {
  try {
    const result = await signTransaction(xdr, {
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.signedTxXdr;
  } catch (error) {
    console.error("Error signing transaction:", error);
    throw error;
  }
}
