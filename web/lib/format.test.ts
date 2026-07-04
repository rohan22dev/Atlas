import { describe, expect, it } from "vitest";
import {
  fixedToNumber,
  formatAmount,
  formatBps,
  formatHealthFactor,
  healthFactorSeverity,
  numberToFixed,
  truncateAddress,
} from "./format";
import { HEALTH_FACTOR_MAX } from "./contracts/config";

describe("numberToFixed / fixedToNumber round-trip", () => {
  it("converts whole numbers", () => {
    expect(numberToFixed("100")).toBe(1_000_000_000n);
    expect(fixedToNumber(1_000_000_000n)).toBe(100);
  });

  it("converts decimals", () => {
    expect(numberToFixed("12.5")).toBe(125_000_000n);
    expect(fixedToNumber(125_000_000n)).toBe(12.5);
  });

  it("handles empty/invalid input as zero", () => {
    expect(numberToFixed("")).toBe(0n);
    expect(numberToFixed("abc")).toBe(0n);
  });

  it("truncates excess decimal precision instead of rounding", () => {
    expect(numberToFixed("1.123456789")).toBe(11_234_567n);
  });
});

describe("formatAmount", () => {
  it("formats with thousands separators", () => {
    expect(formatAmount(12_345_670_000_000n)).toBe("1,234,567");
  });
});

describe("formatBps", () => {
  it("renders basis points as a percentage", () => {
    expect(formatBps(6000n)).toBe("60%");
    expect(formatBps(500n)).toBe("5%");
  });
});

describe("formatHealthFactor / healthFactorSeverity", () => {
  it("renders infinity for debt-free positions", () => {
    expect(formatHealthFactor(HEALTH_FACTOR_MAX)).toBe("∞");
    expect(healthFactorSeverity(HEALTH_FACTOR_MAX)).toBe("safe");
  });

  it("classifies severity thresholds", () => {
    expect(healthFactorSeverity(20_000_000n)).toBe("safe"); // 2.0
    expect(healthFactorSeverity(12_000_000n)).toBe("warning"); // 1.2
    expect(healthFactorSeverity(9_000_000n)).toBe("danger"); // 0.9
  });
});

describe("truncateAddress", () => {
  it("shortens long addresses", () => {
    expect(truncateAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")).toBe("GABC...7890");
  });

  it("leaves short strings untouched", () => {
    expect(truncateAddress("short")).toBe("short");
  });
});
