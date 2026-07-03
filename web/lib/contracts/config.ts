import deployed from "./deployed_addresses.json";

export interface DeployedAddresses {
  network: string;
  networkPassphrase: string;
  rpcUrl: string;
  horizonUrl: string;
  deployedAt: string;
  admin: string;
  contracts: {
    xlmToken: string;
    usdcToken: string;
    oracle: string;
    treasury: string;
    vault: string;
    liquidation: string;
  };
  protocolParams: {
    ltvBps: number;
    liquidationThresholdBps: number;
    liquidationBonusBps: number;
    interestRateBps: number;
  };
}

export const DEPLOYED = deployed as DeployedAddresses;

export const NETWORK_PASSPHRASE = DEPLOYED.networkPassphrase;
export const RPC_URL = DEPLOYED.rpcUrl;
export const HORIZON_URL = DEPLOYED.horizonUrl;

export const CONTRACTS = DEPLOYED.contracts;
export const PROTOCOL_PARAMS = DEPLOYED.protocolParams;
export const ADMIN_ADDRESS = DEPLOYED.admin;

/** 7-decimal fixed point scale shared by all token amounts, prices, and the health factor. */
export const FIXED_POINT_SCALE = 10_000_000n;
/** Health factor value representing 1.0 (the liquidation boundary). */
export const HEALTH_FACTOR_ONE = 10_000_000n;
/** Sentinel returned by the Vault contract for positions carrying no debt. */
export const HEALTH_FACTOR_MAX = (1n << 127n) - 1n;

export const ASSET_SYMBOLS = {
  XLM: "XLM",
  USDC: "USDC",
} as const;
