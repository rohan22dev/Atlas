/** Raw on-chain vault position, as stored by the Vault contract. */
export interface Position {
  collateral: bigint;
  debt_principal: bigint;
  created_at: bigint;
  last_accrued: bigint;
}

/** Fully computed vault position view, with interest applied as of now. */
export interface PositionView {
  collateral: bigint;
  debt: bigint;
  health_factor: bigint;
  ltv_bps: bigint;
  collateral_value_usd: bigint;
  debt_value_usd: bigint;
  created_at: bigint;
  last_accrued: bigint;
}

export interface ProtocolConfig {
  admin: string;
  collateral_token: string;
  borrow_token: string;
  collateral_symbol: string;
  borrow_symbol: string;
  oracle: string;
  treasury: string;
  liquidation_contract: string;
  ltv_bps: bigint;
  liquidation_threshold_bps: bigint;
  liquidation_bonus_bps: bigint;
  interest_rate_bps: bigint;
}

/** A vault as displayed on the Liquidation Market page. */
export interface LiquidatableVault {
  owner: string;
  collateral: bigint;
  debt: bigint;
  healthFactor: bigint;
  isLiquidatable: bigint | boolean;
  estimatedBonus: bigint;
}

export type AssetSymbol = "XLM" | "USDC";

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: string | null;
}
