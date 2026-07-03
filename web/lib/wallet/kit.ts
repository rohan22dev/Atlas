import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { Networks, StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";

let initialized = false;

/** Initializes the Stellar Wallets Kit exactly once, client-side only.
 * Supports Freighter (the primary Soroban wallet), plus xBull and Lobstr
 * as additional testnet-friendly options. */
export function ensureWalletKitInitialized(): void {
  if (initialized || typeof window === "undefined") return;
  StellarWalletsKit.init({
    modules: [new FreighterModule(), new xBullModule(), new LobstrModule()],
    network: Networks.TESTNET,
    authModal: {
      showInstallLabel: true,
    },
  });
  initialized = true;
}

export { StellarWalletsKit };
