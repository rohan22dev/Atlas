import { FIXED_POINT_SCALE, HEALTH_FACTOR_MAX } from "./contracts/config";

/** Converts a 7-decimal fixed point bigint into a JS number (lossy for very large values, fine for display). */
export function fixedToNumber(value: bigint, decimals = 7): number {
  const scale = 10 ** decimals;
  return Number(value) / scale;
}

/** Converts a human-entered decimal amount (e.g. from a text input) into a 7-decimal fixed point bigint. */
export function numberToFixed(value: number | string, decimals = 7): bigint {
  const str = typeof value === "number" ? value.toString() : value;
  if (!str || Number.isNaN(Number(str))) return 0n;
  const [whole, frac = ""] = str.split(".");
  const paddedFrac = (frac + "0".repeat(decimals)).slice(0, decimals);
  const sign = whole.startsWith("-") ? -1n : 1n;
  const wholeDigits = whole.replace("-", "") || "0";
  const combined = BigInt(wholeDigits + paddedFrac || "0");
  return sign * combined;
}

export function formatAmount(value: bigint, opts: { decimals?: number; maxFractionDigits?: number } = {}): string {
  const { decimals = 7, maxFractionDigits = 4 } = opts;
  const num = fixedToNumber(value, decimals);
  return num.toLocaleString("en-US", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });
}

export function formatUsd(value: bigint, opts: { decimals?: number } = {}): string {
  const { decimals = 7 } = opts;
  const num = fixedToNumber(value, decimals);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: num < 1 ? 4 : 2,
  });
}

export function formatBps(bps: bigint | number): string {
  const num = typeof bps === "bigint" ? Number(bps) : bps;
  return `${(num / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

/** Renders a health factor (7-decimal fixed point) as "∞" for debt-free vaults, else e.g. "1.85". */
export function formatHealthFactor(hf: bigint): string {
  if (hf >= HEALTH_FACTOR_MAX / 2n) return "∞";
  const num = fixedToNumber(hf);
  return num.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export function healthFactorSeverity(hf: bigint): "safe" | "warning" | "danger" {
  if (hf >= HEALTH_FACTOR_MAX / 2n) return "safe";
  const num = fixedToNumber(hf);
  if (num >= 1.5) return "safe";
  if (num >= 1.05) return "warning";
  return "danger";
}

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function bpsToRatio(bps: bigint | number): number {
  return Number(bps) / 10_000;
}

export { FIXED_POINT_SCALE };
