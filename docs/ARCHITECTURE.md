# Architecture

## System overview

Atlas has two moving parts: five Soroban smart contracts on Stellar Testnet, and a Next.js frontend that talks
to them directly. There is no backend server, no database, and no API layer in between — every read is a
Soroban RPC simulation call, and every write is a wallet-signed transaction submitted straight to the network.

```
┌────────────────────┐        Soroban RPC        ┌──────────────────────────┐
│   Next.js Frontend   │ ────────────────────────► │  Stellar Testnet          │
│                      │ ◄──────────────────────── │                          │
│  reads: simulate     │      simulate/submit      │  Oracle   Token   Treasury│
│  writes: wallet-signed│                           │  Vault    Liquidation    │
└──────────┬───────────┘                           └──────────────────────────┘
           │
           │ sign transactions
┌──────────▼───────────┐
│  Freighter / xBull /   │
│  Lobstr (browser wallet)│
└───────────────────────┘
```

## Why one Vault contract, not one per user

Rather than deploying a new contract instance per user (expensive, and hard to enumerate), the Vault is a
single deployed contract that stores every user's position in a `Map<Address, Position>`-style persistent
storage, keyed by owner address. This mirrors how Aave/Compound pools work and is the standard Soroban pattern
for multi-user protocols.

Since Soroban contract storage cannot be iterated externally, the Vault also keeps an internal `Vec<Address>`
of every address that has ever opened a position (`get_all_users`), which the frontend uses to enumerate vaults
for the Liquidation Market and Protocol Stats pages.

## Cross-contract composition

Vault, Treasury, and Liquidation call into each other. Soroban has no shared Rust code between separately
deployed contracts unless you explicitly import it — and naively adding a sibling contract crate as a normal
Cargo dependency pulls its `#[contractimpl]`-generated wasm exports into your own binary, causing duplicate
symbol errors at link time. Atlas avoids this with a small `clients.rs` module in each contract that needs to
call another one: a `#[contractclient]`-annotated trait declares just the function signatures it needs, and the
macro generates a lightweight `Client` that calls the deployed contract by address at runtime, with zero
implementation code pulled in. See `contracts/vault/src/clients.rs` and `contracts/liquidation/src/clients.rs`.

Authorization between contracts relies on Soroban's implicit contract auth: when Contract A directly invokes
Contract B, and B calls `some_stored_address.require_auth()`, that check passes automatically if
`some_stored_address == A` — no signature needed, because A is the one executing the call. This is how:

- `Treasury.disburse()` / `Treasury.record_fee()` are restricted to the registered Vault address.
- `Vault.seize()` is restricted to the registered Liquidation contract address.

## Liquidation is atomic

`Liquidation.liquidate()` first checks the target vault's health factor via the Vault contract, then transfers
the liquidator's USDC repayment into the Treasury, and only then calls `Vault.seize()` to move collateral to the
liquidator. All of this happens in a single Soroban transaction — if the USDC transfer fails (insufficient
balance/allowance), the whole transaction reverts and no collateral moves. There is no code path where
collateral is seized without the debt actually being repaid.

## Pricing and fixed-point math

All token amounts, USD prices, and the health factor use 7-decimal fixed-point integers (matching Stellar's
native stroop convention, so XLM and the test USDC token share the same decimal scale). See
`contracts/vault/src/math.rs` for the canonical implementation, and `web/lib/protocol-math.ts` for the
frontend's mirror of the same math (used only for instant UI previews before a transaction is submitted — the
contract remains the source of truth).

## No backend, but not no indexing

The frontend needs some historical data (collateral/debt over time for the Vault Details charts, and a global
list of activity). Rather than standing up Supabase/Postgres and a separate indexing worker, Atlas queries
Soroban RPC's `getEvents` directly from the browser, filtered by contract ID and topic (every mutating function
emits a structured event — see `docs/SMART_CONTRACTS.md#events`). This keeps the "no backend" property intact
while still producing real historical charts and an activity feed, with graceful degradation if the RPC
provider's event-retention window is shorter than requested (`web/lib/contracts/events.ts` retries with
progressively smaller ledger windows).

## Frontend structure

- `app/` — Next.js App Router routes. `(app)/` is a route group for the authenticated shell (sidebar + navbar);
  the landing page and `/docs` live outside it with their own nav.
- `components/` — organized by domain: `layout/` (navbar, sidebar, shell), `landing/`, `dashboard/`, `vault/`
  (deposit/borrow/repay/withdraw forms + modals), `liquidation/`, `charts/`, `shared/` (stat cards, health/risk
  meters, wallet button, logo), and `ui/` (shadcn/ui primitives).
- `hooks/` — one hook per concern: `use-wallet` (Stellar Wallets Kit context), `use-position`/`use-balances`/
  `use-oracle`/`use-protocol-stats`/`use-liquidatable-vaults` (TanStack Query reads), and
  `use-vault-actions`/`use-liquidation-actions`/`use-token-actions` (mutations, all built on a single shared
  `use-contract-mutation` primitive that handles build → wallet-sign → submit → toast → cache-invalidate once).
- `lib/contracts/` — the typed contract client layer: `config.ts` (deployed addresses), `tx.ts` (the
  build/simulate/submit primitives using `@stellar/stellar-sdk`), `scval.ts` (native ↔ ScVal conversion
  helpers), `errors.ts` (contract error code → human message maps), and one file per contract
  (`vault.ts`/`oracle.ts`/`treasury.ts`/`liquidation.ts`/`token.ts`) exposing typed read/write functions.
