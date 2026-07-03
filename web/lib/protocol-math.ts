import { FIXED_POINT_SCALE, HEALTH_FACTOR_MAX } from "./contracts/config";

/**
 * Client-side mirror of the Vault contract's fixed-point math
 * (contracts/vault/src/math.rs), used purely for instant UI previews
 * before a transaction is submitted. The contract remains the single
 * source of truth -- these are estimates only.
 */

export function usdValue(amount: bigint, price: bigint): bigint {
  return (amount * price) / FIXED_POINT_SCALE;
}

export function healthFactor(collateralValue: bigint, debtValue: bigint, liqThresholdBps: bigint): bigint {
  if (debtValue <= 0n) return HEALTH_FACTOR_MAX;
  const weighted = (collateralValue * liqThresholdBps) / 10_000n;
  return (weighted * FIXED_POINT_SCALE) / debtValue;
}

export function maxBorrowUsd(collateralValue: bigint, ltvBps: bigint): bigint {
  return (collateralValue * ltvBps) / 10_000n;
}

export function ltvBpsOf(collateralValue: bigint, debtValue: bigint): bigint {
  if (collateralValue <= 0n) return 0n;
  return (debtValue * 10_000n) / collateralValue;
}

/** USD price of the collateral asset at which the position's health factor hits exactly 1.0. */
export function liquidationPrice(collateral: bigint, debtValueUsd: bigint, liqThresholdBps: bigint): bigint {
  if (collateral <= 0n || debtValueUsd <= 0n) return 0n;
  return (debtValueUsd * 10_000n * FIXED_POINT_SCALE) / (collateral * liqThresholdBps);
}
