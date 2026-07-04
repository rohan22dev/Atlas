# Security

## Threat model

Atlas runs entirely on Stellar Testnet with test assets, but the contracts are written and tested as if they
guarded real value — the goal is to demonstrate production-grade Soroban patterns, not testnet-only shortcuts.

## Mitigations by category

### Arithmetic safety

All balance and debt math uses `checked_add`/`checked_mul`/`checked_div` (or panics on overflow, which reverts
the whole transaction) — see `contracts/vault/src/math.rs` and `contracts/token/src/storage.rs`. There is no
path where a balance or debt figure can silently wrap or underflow.

### Authorization

Every state-changing function requires `require_auth()` from the relevant party:
- `deposit`/`withdraw`/`borrow`/`repay` require the acting user's own signature.
- `Treasury.disburse`/`record_fee` require the registered Vault contract to be the direct caller.
- `Vault.seize` requires the registered Liquidation contract to be the direct caller.
- Admin functions (`update_price`, `set_admin`, `set_vault`, `set_liquidation_contract`, treasury `withdraw`)
  require the stored admin address.

Contract-to-contract authorization relies on Soroban's implicit auth model (a contract's own address
automatically satisfies `require_auth()` when it is the direct invoker), not on caller-supplied addresses —
so a malicious contract cannot claim to be the Vault or the Liquidation contract by simply passing that address
as an argument.

### Borrowing and withdrawal invariants

- `borrow` recomputes the position's USD-denominated debt (existing + requested) against 60% of collateral
  value and rejects anything over that line — including cumulative borrows across multiple calls, since the
  check always uses the position's total post-borrow debt, not just the new amount.
- `withdraw` simulates the resulting collateral and, if the position carries any debt, rejects the withdrawal
  if the resulting health factor would drop below 1.0 (the 80% liquidation threshold).
- Both checks re-read live oracle prices on every call, so they can't be bypassed by stale cached values.

### Liquidation atomicity

`Liquidation.liquidate()` transfers the liquidator's USDC repayment into the Treasury *before* calling
`Vault.seize()`. Both calls are part of the same Soroban transaction, so if the transfer fails (insufficient
balance or allowance), the entire transaction reverts and no collateral is seized. There is no code path that
seizes collateral without the debt actually being repaid first.

### Double-borrow / re-entrancy

Soroban's execution model does not allow the kind of classic EVM re-entrancy (a contract calling back into a
caller mid-execution to double-spend state) — each contract invocation runs to completion against a consistent
storage view, and cross-contract calls in Atlas only ever move forward through the
Liquidation → Treasury → Vault chain, never back into a contract that's still mid-call. The `borrow` function
also demonstrates that sequential calls compound correctly against the LTV limit rather than each being checked
against a stale snapshot (`test_double_borrow_cumulative_checked_against_ltv`).

### Negative and zero amounts

Every function that accepts an amount rejects `<= 0` (or `< 0` where zero is meaningful) at the very top of the
function, before any state is touched.

### Faucet abuse

The test USDC faucet is permissionless by design (no privileged backend signer), rate-limited to one claim per
address per hour via a cooldown stored in temporary storage. Since the token has no real value, this is a
usability/spam control rather than a value-protection one.

### Reliability bugs found via live-network verification (fixed)

Two Soroban-specific issues surfaced only when exercising the deployed contracts end-to-end over real RPC
(`web/scripts/verify-flow.ts` / `verify-liquidation.ts`) — not from unit tests, which run against an in-memory
host with no gap between "simulate" and "execute." Both are fixed in the current contracts:

1. **Conditional cross-contract calls can fall outside the simulated footprint.** `Vault::accrue` only called
   `Treasury.record_fee` when interest had accrued (`interest_delta > 0`). Because interest depends on
   `env.ledger().timestamp()`, the elapsed time -- and therefore whether that branch runs -- can differ between
   when a transaction is simulated (which fixes the storage "footprint" the transaction is allowed to touch) and
   when it actually executes a few seconds later. A `repay` that simulated with `interest_delta == 0` (skipping
   the Treasury call, so Treasury's contract instance wasn't in the footprint) could execute with
   `interest_delta > 0`, calling Treasury anyway and failing with a footprint error. **Fix:** call
   `Treasury.record_fee` unconditionally (even with `amount == 0`), so the footprint is identical regardless of
   timing.
2. **Auth entries are bound to exact argument values, not just function names.** `Liquidation.liquidate` used to
   read the position's live debt on-chain and use that figure directly as the amount in an auth-required
   `token.transfer`. Soroban authorization signs a specific invocation tree including its arguments; since debt
   accrues every second, the amount at simulation time (when the wallet signs) can differ from the amount at
   execution time, making the signed authorization not match the actual call and fail with
   `scecInvalidAction` / "Unauthorized function call for address." The same risk existed in `Vault::repay` for
   full-balance repayments. **Fix:** `repay` now takes the caller's `amount` as the literal, non-reinterpreted
   transfer amount and rejects it outright if it exceeds current debt (`RepayExceedsDebt`) instead of silently
   clamping it to a different, live-recomputed figure. `liquidate` now takes an explicit `repay_amount` argument
   (the frontend pads the last-read debt with a small buffer) and requires it to cover the position's actual
   debt (`InsufficientRepayAmount` / `InsufficientRepayment`); any small surplus is left in the Treasury rather
   than triggering a second auth-constrained transfer to refund it.

The general lesson, applicable to any Soroban contract: never let a value that changes with `env.ledger()`
state determine *which* cross-contract calls happen or *what arguments* an auth-required call uses, unless that
exact value was itself supplied (and thus signed for) by the calling account.

## What is *not* hardened (by design, for this MVP)

- **Oracle centralization.** Prices are admin-pushed, not sourced from a decentralized feed. This is explicit
  in the PRD and the interface (`get_price`/`update_price`) is designed so a real feed (e.g. Reflector) could
  replace the admin-push model without changing any other contract.
- **No partial liquidations / no liquidation auctions.** A liquidation clears a vault's entire debt in one call;
  there's no Dutch-auction or partial-liquidation mechanism.
- **No pausability / circuit breaker.** A production version would likely add an admin-gated pause switch.
- **No formal audit.** This codebase has not been reviewed by a third-party security firm.

## Testing coverage

57 Rust tests across the 5 contracts cover, among other things: unauthorized access, double-initialization,
negative/zero amounts, over-LTV borrows (including cumulative), unhealthy withdrawals, liquidating a healthy
vault (rejected), liquidating without the registered liquidation contract wired up (rejected), and the full
atomic liquidation flow including an insufficient-liquidator-balance case that verifies the whole transaction
reverts cleanly. Run them with `cargo test --workspace`.
