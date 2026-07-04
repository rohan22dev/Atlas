# Smart Contracts

All contracts are written in Rust with `soroban-sdk` 26. Source lives under `contracts/<name>/src/`. Every
contract has a `test.rs` with unit/integration tests run via `cargo test --workspace` (63 tests total).

Fixed-point convention: all USD prices, token amounts, and the health factor use **7 decimal places**
(`PRICE_DECIMALS = 7`, scale `10_000_000`), matching the native XLM Stellar Asset Contract.

---

## Oracle (`contracts/oracle`)

Stores USD prices per asset symbol. Admin-only writes.

**Storage:** `Admin: Address`, `Price(Symbol) -> i128`, `UpdatedAt(Symbol) -> u64`

**Functions**
| Function | Auth | Description |
|---|---|---|
| `initialize(admin)` | admin | One-time setup |
| `get_admin()` | — | View |
| `set_admin(new_admin)` | admin | Rotates admin |
| `update_price(asset: Symbol, price: i128)` | admin | Price must be > 0 |
| `get_price(asset: Symbol) -> i128` | — | Errors if unset |
| `get_updated_at(asset: Symbol) -> u64` | — | Ledger timestamp of last update |

**Events:** `oracle_updated { asset, price, timestamp }`, `admin_updated { previous_admin, new_admin }`

**Errors:** `NotInitialized`, `AlreadyInitialized`, `NotAdmin`, `InvalidPrice`, `PriceNotSet`

---

## Token (`contracts/token`) — Atlas Test USDC

A SEP-41 (Stellar's fungible token interface) implementation with two additions: an admin `mint` (used to seed
the Treasury at deploy time) and a **permissionless `faucet`** so end users can self-serve test USDC with no
privileged backend signer involved.

**Functions:** `initialize`, `mint` (admin), `set_admin`, `admin`, `allowance`, `approve`, `balance`,
`transfer`, `transfer_from`, `burn`, `burn_from`, `decimals`, `name`, `symbol`, and:

| Function | Auth | Description |
|---|---|---|
| `faucet(to: Address) -> i128` | `to` (self) | Mints 1,000 tokens to the caller, max once per hour per address |

**Events:** `transfer`, `mint`, `burn`, `approve`, `faucet_claimed { to, amount }`

---

## Treasury (`contracts/treasury`)

Custodies the protocol's USDC liquidity.

**Storage:** `Admin`, `Vault`, `Token`, `TotalFees: i128`

**Functions**
| Function | Auth | Description |
|---|---|---|
| `initialize(admin, token)` | admin | |
| `set_vault(vault)` | admin | One-time wiring after Vault is deployed |
| `fund(from, amount)` | `from` | Anyone can add liquidity |
| `disburse(to, amount)` | **Vault only** | Pays out a borrow |
| `record_fee(amount) -> i128` | **Vault only** | Books interest revenue (bookkeeping only, no transfer) |
| `withdraw(to, amount)` | admin | Treasury management sweep |
| `get_balance() -> i128` | — | Current USDC balance |
| `get_total_fees() -> i128` | — | Cumulative interest booked |

**Events:** `funded`, `disbursed`, `fees_collected`, `withdrawn`

**Errors:** `NotInitialized`, `AlreadyInitialized`, `NotAdmin`, `NotVault`, `VaultNotSet`, `InvalidAmount`,
`InsufficientLiquidity`

---

## Vault (`contracts/vault`) — the core lending pool

**Storage:** per-user `Position { collateral, debt_principal, created_at, last_accrued }`, plus protocol config
(admin, collateral/borrow token + symbol, oracle, treasury, liquidation contract addresses) and a `UserList`
for enumeration.

**Functions**
| Function | Auth | Description |
|---|---|---|
| `initialize(admin, collateral_token, borrow_token, collateral_symbol, borrow_symbol, oracle, treasury)` | admin | |
| `set_liquidation_contract(addr)` | admin | Wiring after Liquidation is deployed |
| `get_config() -> ProtocolConfig` | — | All addresses + params, for frontend discovery |
| `deposit(user, amount) -> i128` | `user` | Transfers collateral in, returns new collateral total |
| `withdraw(user, amount) -> i128` | `user` | Rejected if it would drop health factor below 1.0 |
| `borrow(user, amount) -> i128` | `user` | Rejected if it would exceed 60% LTV |
| `repay(user, amount) -> i128` | `user` | Rejects `amount` that exceeds current debt (`RepayExceedsDebt`) rather than clamping it |
| `calculate_health(user) -> i128` | — | Health factor, scaled 1e7 (1.0 == 10_000_000); `i128::MAX` if no debt |
| `get_position(user) -> Position` | — | Raw stored state |
| `get_debt(user) -> i128` | — | Current debt with interest applied as of now |
| `get_position_view(user) -> PositionView` | — | Fully computed view: debt, health, USD values, LTV |
| `get_all_users() -> Vec<Address>` | — | Every address that has ever opened a position |
| `seize(liquidator, owner, repay_amount) -> (i128, i128)` | **Liquidation contract only** | Requires `repay_amount >= current debt`; clears debt, transfers bonus collateral |

**Interest model:** simple annual interest at a fixed 5% (`INTEREST_RATE_BPS = 500`), accrued continuously and
checkpointed (rolled into `debt_principal`) on every `borrow`/`repay`/`seize` call. Each time interest is
checkpointed, the accrued delta is reported to the Treasury via `record_fee` for protocol-wide fee stats.

**Events:** `deposited`, `withdrawn`, `borrowed`, `repaid`, `seized`

**Errors:** `NotInitialized`, `AlreadyInitialized`, `InvalidAmount`, `NoPosition`, `ExceedsLtv`,
`InsufficientCollateral`, `InsufficientDebt`, `WouldBeUnhealthy`, `NotLiquidatable`, `NotLiquidationContract`,
`LiquidationContractNotSet`, `Overflow`, `RepayExceedsDebt`, `InsufficientRepayment`

---

## Liquidation (`contracts/liquidation`)

Orchestrates liquidations; holds no funds itself.

**Functions**
| Function | Auth | Description |
|---|---|---|
| `initialize(admin, vault, treasury, borrow_token)` | admin | |
| `is_liquidatable(user) -> bool` | — | Health factor < 1.0 |
| `liquidate(liquidator, owner, repay_amount) -> (i128, i128)` | `liquidator` | See flow below |
| `get_vault() -> Address` / `get_treasury() -> Address` | — | Discovery |

**Liquidation flow** (all in one transaction):
1. Read `owner`'s health factor from the Vault; reject if ≥ 1.0.
2. Read `owner`'s current debt from the Vault, and require the caller-supplied `repay_amount` covers it.
3. Transfer `repay_amount` USDC from `liquidator` to the Treasury (a fixed figure, matching what the liquidator's wallet actually authorized -- see `docs/SECURITY.md` for why this can't be recomputed live).
4. Call `Vault.seize(liquidator, owner, repay_amount)`, which clears the debt and transfers collateral (bonused 5%, capped at
   available collateral) to the liquidator.

If step 3 fails (insufficient liquidator balance/allowance), the whole transaction reverts before step 4 runs.

**Events:** `liquidation_executed { owner, liquidator, debt_repaid, collateral_seized }`

**Errors:** `NotInitialized`, `AlreadyInitialized`, `NotLiquidatable`, `NoDebt`, `InsufficientRepayAmount`

---

## Events

Every mutating function emits a structured Soroban event (`#[contractevent]`), which the frontend consumes two
ways: live toasts on the submitting user's own transaction, and historical reconstruction via `getEvents` for
the Recent Activity feed and Vault Details charts (see `docs/ARCHITECTURE.md`).
