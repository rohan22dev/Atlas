import { describe, expect, it } from "vitest";
import { healthFactor, liquidationPrice, ltvBpsOf, maxBorrowUsd, usdValue } from "./protocol-math";
import { FIXED_POINT_SCALE, HEALTH_FACTOR_MAX } from "./contracts/config";

// These mirror contracts/vault/src/math.rs's own unit tests 1:1, so the
// frontend's instant-preview math never silently drifts from what the
// Vault contract will actually enforce on-chain.

describe("usdValue", () => {
  it("values 100 XLM at $0.12 as $12.00", () => {
    expect(usdValue(100n * FIXED_POINT_SCALE, 1_200_000n)).toBe(12n * FIXED_POINT_SCALE);
  });
});

describe("healthFactor", () => {
  it("is healthy when weighted collateral exceeds debt", () => {
    // $1000 collateral, 80% threshold, $600 debt => HF = 800/600 = 1.333..
    const hf = healthFactor(1000n * FIXED_POINT_SCALE, 600n * FIXED_POINT_SCALE, 8000n);
    expect(hf).toBeGreaterThan(FIXED_POINT_SCALE);
  });

  it("is unhealthy when weighted collateral falls short of debt", () => {
    // $1000 collateral, 80% threshold, $900 debt => HF = 800/900 = 0.888..
    const hf = healthFactor(1000n * FIXED_POINT_SCALE, 900n * FIXED_POINT_SCALE, 8000n);
    expect(hf).toBeLessThan(FIXED_POINT_SCALE);
  });

  it("returns the max sentinel for debt-free positions", () => {
    expect(healthFactor(1000n * FIXED_POINT_SCALE, 0n, 8000n)).toBe(HEALTH_FACTOR_MAX);
  });
});

describe("maxBorrowUsd", () => {
  it("caps borrowing at the configured LTV", () => {
    expect(maxBorrowUsd(1000n * FIXED_POINT_SCALE, 6000n)).toBe(600n * FIXED_POINT_SCALE);
  });
});

describe("ltvBpsOf", () => {
  it("computes the debt-to-collateral ratio in basis points", () => {
    expect(ltvBpsOf(1000n * FIXED_POINT_SCALE, 600n * FIXED_POINT_SCALE)).toBe(6000n);
  });

  it("returns zero when there is no collateral", () => {
    expect(ltvBpsOf(0n, 100n)).toBe(0n);
  });
});

describe("liquidationPrice", () => {
  it("solves for the collateral price at which health factor hits 1.0", () => {
    // 10,000 XLM collateral, $600 debt value, 80% liq threshold.
    // price = 600 * 10000 * 1e7 / (10000 * 8000) = 750,000 (i.e. $0.075)
    const price = liquidationPrice(10_000n * FIXED_POINT_SCALE, 600n * FIXED_POINT_SCALE, 8000n);
    expect(price).toBe(750_000n);

    // Confirm that price actually drives HF to ~1.0.
    const collateralValue = usdValue(10_000n * FIXED_POINT_SCALE, price);
    const hf = healthFactor(collateralValue, 600n * FIXED_POINT_SCALE, 8000n);
    expect(hf).toBe(FIXED_POINT_SCALE);
  });

  it("returns zero when there is no debt or no collateral", () => {
    expect(liquidationPrice(0n, 100n, 8000n)).toBe(0n);
    expect(liquidationPrice(100n, 0n, 8000n)).toBe(0n);
  });
});
