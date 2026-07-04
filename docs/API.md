# API Reference

Atlas has no REST or GraphQL API — the frontend talks to the Soroban contracts directly over RPC. This document
describes that client-side "API": the typed functions in `web/lib/contracts/` that every hook and component
uses, and the RPC primitives underneath them.

## RPC primitives (`web/lib/contracts/tx.ts`)

```ts
readContract<T>(contractId, method, args, sourceAddress?, errorMap?): Promise<T>
```
Simulates a read-only contract call (no wallet signature required) and returns the decoded native value.
Defaults `sourceAddress` to the deployment admin's address when no wallet is connected, since simulation still
needs a valid account for sequence-number lookup even for pure reads.

```ts
buildContractTx(contractId, method, args, sourcePublicKey, errorMap?): Promise<string>
```
Builds and simulates (`server.prepareTransaction`) a state-changing call, returning an assembled, auth- and
footprint-resolved transaction XDR string ready to hand to a wallet for signing.

```ts
submitSignedTransaction<T>(signedXdr): Promise<{ status: "SUCCESS"; hash: string; value?: T }>
```
Submits a signed transaction and polls `getTransaction` until it lands, decoding the return value if present.

Both `readContract` and `buildContractTx` accept an `errorMap` (see `lib/contracts/errors.ts`) so a raw
`Error(Contract, #N)` failure gets translated into the matching contract's human-readable message.

## Per-contract modules

Each file exposes plain async functions — no classes, no hidden state beyond the shared RPC server instance.

### `lib/contracts/vault.ts`
- `readPosition(userAddress) -> Position`
- `readPositionView(userAddress) -> PositionView`
- `readHealthFactor(userAddress) -> bigint`
- `readDebt(userAddress) -> bigint`
- `readProtocolConfig() -> ProtocolConfig`
- `readAllUsers() -> string[]`
- `buildDepositTx(userPublicKey, amount) -> string`
- `buildWithdrawTx(userPublicKey, amount) -> string`
- `buildBorrowTx(userPublicKey, amount) -> string`
- `buildRepayTx(userPublicKey, amount) -> string`

### `lib/contracts/oracle.ts`
- `readPrice(asset: "XLM" | "USDC") -> bigint`
- `readUpdatedAt(asset) -> bigint`
- `buildUpdatePriceTx(adminPublicKey, asset, price) -> string`

### `lib/contracts/treasury.ts`
- `readTreasuryBalance() -> bigint`
- `readTotalFees() -> bigint`

### `lib/contracts/liquidation.ts`
- `readIsLiquidatable(userAddress) -> boolean`
- `buildLiquidateTx(liquidatorPublicKey, ownerAddress) -> string`

### `lib/contracts/token.ts`
- `readTokenBalance(tokenId, ownerAddress) -> bigint`
- `readXlmBalance(ownerAddress)` / `readUsdcBalance(ownerAddress)`
- `buildApproveTx(tokenId, ownerPublicKey, spender, amount, expirationLedger) -> string`
- `buildUsdcFaucetTx(userPublicKey) -> string`

### `lib/contracts/events.ts`
- `fetchContractEvents(contractIds, limit?) -> ActivityEvent[]` — wraps `server.getEvents`, decoding topics/value
  into plain objects, with automatic fallback to smaller ledger windows if the RPC provider's retention is
  shorter than requested.

## React hooks (`web/hooks/`)

Reads are TanStack Query hooks (`usePositionView`, `useBalances`, `useOraclePrice`, `useProtocolStats`,
`useAllVaults`/`useLiquidatableVaults`, `useRecentActivity`, `useVaultHistory`) with sensible `refetchInterval`s.

Writes go through `useContractMutation`, a single shared primitive that every action hook
(`useDeposit`/`useWithdraw`/`useBorrow`/`useRepay`/`useLiquidate`/`useUsdcFaucet`/`useUpdateOraclePrice`) wraps:
it builds the unsigned XDR, prompts the connected wallet to sign, submits it, surfaces progress via toasts, and
invalidates the relevant query keys on success — so each action hook is only a few lines specifying which
builder function to call and which queries to invalidate.

## Wallet (`web/hooks/use-wallet.tsx`)

A React context around `@creit.tech/stellar-wallets-kit`, exposing `address`, `isConnected`, `isConnecting`,
`isCorrectNetwork`, `connect()`, `disconnect()`, and `signTransaction(xdr)`. Supports Freighter, xBull, and
Lobstr out of the box.
