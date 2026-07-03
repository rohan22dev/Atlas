import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

/** Converts a G... account or C... contract address string into an ScVal. */
export function addressToScVal(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

/** Converts a bigint/number into a 128-bit signed integer ScVal. */
export function i128ToScVal(value: bigint | number): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

/** Converts a bigint/number into an unsigned 32-bit integer ScVal. */
export function u32ToScVal(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

/** Converts a bigint/number into an unsigned 64-bit integer ScVal. */
export function u64ToScVal(value: bigint | number): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

/** Converts a short string into a Soroban Symbol ScVal. */
export function symbolToScVal(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "symbol" });
}
