//! Atlas Vault Contract
//!
//! The core lending-pool contract. Holds every user's collateral custody
//! and debt bookkeeping in a single deployed instance (keyed by owner
//! address), mirroring how Aave/Compound-style pools work rather than
//! deploying one contract per user.
//!
//! Protocol parameters (MVP, fixed at compile time per the PRD):
//!   - Max LTV at origination:      60%
//!   - Liquidation threshold:       80%
//!   - Liquidation bonus:           5%
//!   - Borrow interest:             5% simple annual, accrued continuously
//!
//! Prices come from the Oracle contract, quoted as USD with 7 decimal
//! fixed point (matching the 7-decimal convention used by both the native
//! XLM Stellar Asset Contract and the Atlas test USDC token).

#![no_std]

mod clients;
mod math;
#[cfg(test)]
mod test;

use clients::{OracleClient, TreasuryClient};
use math::{accrue_interest, health_factor, usd_value, HEALTH_MAX, HEALTH_SCALE};
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
    Symbol, Vec,
};

pub const LTV_BPS: i128 = 6000;
pub const LIQUIDATION_THRESHOLD_BPS: i128 = 8000;
pub const LIQUIDATION_BONUS_BPS: i128 = 500;
pub const INTEREST_RATE_BPS: i128 = 500;
pub const BPS_DENOMINATOR: i128 = 10_000;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    CollateralToken,
    BorrowToken,
    CollateralSymbol,
    BorrowSymbol,
    Oracle,
    Treasury,
    LiquidationContract,
    Position(Address),
    UserList,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Position {
    pub collateral: i128,
    pub debt_principal: i128,
    pub created_at: u64,
    pub last_accrued: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PositionView {
    pub collateral: i128,
    pub debt: i128,
    pub health_factor: i128,
    pub ltv_bps: i128,
    pub collateral_value_usd: i128,
    pub debt_value_usd: i128,
    pub created_at: u64,
    pub last_accrued: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProtocolConfig {
    pub admin: Address,
    pub collateral_token: Address,
    pub borrow_token: Address,
    pub collateral_symbol: Symbol,
    pub borrow_symbol: Symbol,
    pub oracle: Address,
    pub treasury: Address,
    pub liquidation_contract: Address,
    pub ltv_bps: i128,
    pub liquidation_threshold_bps: i128,
    pub liquidation_bonus_bps: i128,
    pub interest_rate_bps: i128,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VaultError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvalidAmount = 3,
    NoPosition = 4,
    ExceedsLtv = 5,
    InsufficientCollateral = 6,
    InsufficientDebt = 7,
    WouldBeUnhealthy = 8,
    NotLiquidatable = 9,
    NotLiquidationContract = 10,
    LiquidationContractNotSet = 11,
    Overflow = 12,
    RepayExceedsDebt = 13,
    InsufficientRepayment = 14,
}

#[contractevent(topics = ["deposited"])]
pub struct Deposited {
    #[topic]
    pub user: Address,
    pub amount: i128,
    pub new_collateral: i128,
}

#[contractevent(topics = ["withdrawn"])]
pub struct Withdrawn {
    #[topic]
    pub user: Address,
    pub amount: i128,
    pub new_collateral: i128,
}

#[contractevent(topics = ["borrowed"])]
pub struct Borrowed {
    #[topic]
    pub user: Address,
    pub amount: i128,
    pub new_debt: i128,
}

#[contractevent(topics = ["repaid"])]
pub struct Repaid {
    #[topic]
    pub user: Address,
    pub amount: i128,
    pub new_debt: i128,
}

#[contractevent(topics = ["seized"])]
pub struct Seized {
    #[topic]
    pub owner: Address,
    #[topic]
    pub liquidator: Address,
    pub debt_cleared: i128,
    pub collateral_seized: i128,
}

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        collateral_token: Address,
        borrow_token: Address,
        collateral_symbol: Symbol,
        borrow_symbol: Symbol,
        oracle: Address,
        treasury: Address,
    ) -> Result<(), VaultError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(VaultError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::CollateralToken, &collateral_token);
        env.storage()
            .instance()
            .set(&DataKey::BorrowToken, &borrow_token);
        env.storage()
            .instance()
            .set(&DataKey::CollateralSymbol, &collateral_symbol);
        env.storage()
            .instance()
            .set(&DataKey::BorrowSymbol, &borrow_symbol);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        Ok(())
    }

    /// Wires up the Liquidation contract after it has been deployed
    /// (it in turn needs this Vault's address, so the two must be
    /// connected in a second step). Admin-only.
    pub fn set_liquidation_contract(
        env: Env,
        liquidation_contract: Address,
    ) -> Result<(), VaultError> {
        let admin = Self::require_admin(&env)?;
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::LiquidationContract, &liquidation_contract);
        Ok(())
    }

    pub fn get_config(env: Env) -> Result<ProtocolConfig, VaultError> {
        Ok(ProtocolConfig {
            admin: Self::require_admin(&env)?,
            collateral_token: Self::get_addr(&env, &DataKey::CollateralToken)?,
            borrow_token: Self::get_addr(&env, &DataKey::BorrowToken)?,
            collateral_symbol: env
                .storage()
                .instance()
                .get(&DataKey::CollateralSymbol)
                .ok_or(VaultError::NotInitialized)?,
            borrow_symbol: env
                .storage()
                .instance()
                .get(&DataKey::BorrowSymbol)
                .ok_or(VaultError::NotInitialized)?,
            oracle: Self::get_addr(&env, &DataKey::Oracle)?,
            treasury: Self::get_addr(&env, &DataKey::Treasury)?,
            liquidation_contract: env
                .storage()
                .instance()
                .get(&DataKey::LiquidationContract)
                .unwrap_or(Self::require_admin(&env)?),
            ltv_bps: LTV_BPS,
            liquidation_threshold_bps: LIQUIDATION_THRESHOLD_BPS,
            liquidation_bonus_bps: LIQUIDATION_BONUS_BPS,
            interest_rate_bps: INTEREST_RATE_BPS,
        })
    }

    /// Deposits `amount` of the collateral asset (XLM) into the caller's
    /// vault position.
    pub fn deposit(env: Env, user: Address, amount: i128) -> Result<i128, VaultError> {
        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }
        user.require_auth();

        let collateral_token = Self::get_addr(&env, &DataKey::CollateralToken)?;
        let client = token::Client::new(&env, &collateral_token);
        client.transfer(&user, &env.current_contract_address(), &amount);

        let mut position = Self::load_position(&env, &user);
        position.collateral = position
            .collateral
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;
        if position.created_at == 0 {
            position.created_at = env.ledger().timestamp();
            Self::register_user(&env, &user);
        }
        Self::save_position(&env, &user, &position);

        Deposited {
            user,
            amount,
            new_collateral: position.collateral,
        }
        .publish(&env);
        Ok(position.collateral)
    }

    /// Withdraws `amount` of collateral back to the user. Rejected if the
    /// resulting position would fall below the liquidation threshold.
    pub fn withdraw(env: Env, user: Address, amount: i128) -> Result<i128, VaultError> {
        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }
        user.require_auth();

        let mut position = Self::load_existing_position(&env, &user)?;
        Self::accrue(&env, &mut position);

        if amount > position.collateral {
            return Err(VaultError::InsufficientCollateral);
        }
        let new_collateral = position.collateral - amount;

        if position.debt_principal > 0 {
            let (price_collateral, price_debt) = Self::prices(&env)?;
            let collateral_value = usd_value(new_collateral, price_collateral);
            let debt_value = usd_value(position.debt_principal, price_debt);
            let hf = health_factor(collateral_value, debt_value, LIQUIDATION_THRESHOLD_BPS);
            if hf < HEALTH_SCALE {
                return Err(VaultError::WouldBeUnhealthy);
            }
        }

        position.collateral = new_collateral;
        Self::save_position(&env, &user, &position);

        let collateral_token = Self::get_addr(&env, &DataKey::CollateralToken)?;
        let client = token::Client::new(&env, &collateral_token);
        client.transfer(&env.current_contract_address(), &user, &amount);

        Withdrawn {
            user,
            amount,
            new_collateral,
        }
        .publish(&env);
        Ok(new_collateral)
    }

    /// Borrows `amount` of USDC against the caller's deposited collateral.
    /// Rejected if it would push the position beyond the 60% max LTV.
    pub fn borrow(env: Env, user: Address, amount: i128) -> Result<i128, VaultError> {
        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }
        user.require_auth();

        let mut position = Self::load_existing_position(&env, &user)?;
        if position.collateral <= 0 {
            return Err(VaultError::InsufficientCollateral);
        }
        Self::accrue(&env, &mut position);

        let new_debt = position
            .debt_principal
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;

        let (price_collateral, price_debt) = Self::prices(&env)?;
        let collateral_value = usd_value(position.collateral, price_collateral);
        let new_debt_value = usd_value(new_debt, price_debt);
        let max_debt_value = collateral_value * LTV_BPS / BPS_DENOMINATOR;
        if new_debt_value > max_debt_value {
            return Err(VaultError::ExceedsLtv);
        }

        position.debt_principal = new_debt;
        Self::save_position(&env, &user, &position);

        let treasury = Self::get_addr(&env, &DataKey::Treasury)?;
        let treasury_client = TreasuryClient::new(&env, &treasury);
        treasury_client.disburse(&user, &amount);

        Borrowed {
            user,
            amount,
            new_debt,
        }
        .publish(&env);
        Ok(new_debt)
    }

    /// Repays `amount` of USDC debt. `amount` must not exceed the current
    /// outstanding balance (post-interest) -- callers that intend to
    /// fully close a position should pass the debt value most recently
    /// read; because debt only ever grows between that read and this
    /// call executing (continuous interest accrual), passing that
    /// slightly-stale figure always remains valid, it just leaves a
    /// negligible dust amount outstanding if any time passed. This
    /// contract deliberately does *not* clamp an over-large `amount` down
    /// to the live debt total and transfer that instead: `amount` is also
    /// the exact figure the caller's wallet signed authorization for, and
    /// Soroban authorization is bound to exact argument values -- if the
    /// transferred amount were silently recomputed here to something the
    /// wallet never signed, the transfer's `require_auth` would fail
    /// whenever on-chain debt drifted between simulation and execution.
    pub fn repay(env: Env, user: Address, amount: i128) -> Result<i128, VaultError> {
        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }
        user.require_auth();

        let mut position = Self::load_existing_position(&env, &user)?;
        Self::accrue(&env, &mut position);

        if position.debt_principal <= 0 {
            return Err(VaultError::InsufficientDebt);
        }
        if amount > position.debt_principal {
            return Err(VaultError::RepayExceedsDebt);
        }

        let borrow_token = Self::get_addr(&env, &DataKey::BorrowToken)?;
        let treasury = Self::get_addr(&env, &DataKey::Treasury)?;
        let client = token::Client::new(&env, &borrow_token);
        client.transfer(&user, &treasury, &amount);

        position.debt_principal -= amount;
        Self::save_position(&env, &user, &position);

        Repaid {
            user,
            amount,
            new_debt: position.debt_principal,
        }
        .publish(&env);
        Ok(amount)
    }

    /// Computes the current health factor (scaled by 1e7; 1.0 == 10_000_000).
    /// Returns `i128::MAX` when the position carries no debt.
    pub fn calculate_health(env: Env, user: Address) -> Result<i128, VaultError> {
        let mut position = Self::load_existing_position(&env, &user)?;
        Self::accrue_view(&env, &mut position);
        if position.debt_principal <= 0 {
            return Ok(HEALTH_MAX);
        }
        let (price_collateral, price_debt) = Self::prices(&env)?;
        let collateral_value = usd_value(position.collateral, price_collateral);
        let debt_value = usd_value(position.debt_principal, price_debt);
        Ok(health_factor(
            collateral_value,
            debt_value,
            LIQUIDATION_THRESHOLD_BPS,
        ))
    }

    pub fn get_position(env: Env, user: Address) -> Position {
        Self::load_position(&env, &user)
    }

    /// Current outstanding debt (principal + accrued interest as of now).
    /// Used by the Liquidation contract to determine exactly how much
    /// USDC the liquidator must repay before collateral can be seized.
    pub fn get_debt(env: Env, user: Address) -> i128 {
        let mut position = Self::load_position(&env, &user);
        Self::accrue_view(&env, &mut position);
        position.debt_principal
    }

    /// Returns every address that has ever opened a position. Used by the
    /// frontend to enumerate vaults for the Liquidation Market and
    /// protocol-wide stats pages, since Soroban contract storage cannot be
    /// iterated externally.
    pub fn get_all_users(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::UserList)
            .unwrap_or(Vec::new(&env))
    }

    /// Full computed view of a position: current debt (with interest
    /// applied as of now), health factor, and USD valuations. Used by the
    /// frontend to render the vault card without duplicating interest
    /// math client-side.
    pub fn get_position_view(env: Env, user: Address) -> Result<PositionView, VaultError> {
        let mut position = Self::load_position(&env, &user);
        Self::accrue_view(&env, &mut position);

        let (price_collateral, price_debt) = Self::prices(&env)?;
        let collateral_value = usd_value(position.collateral, price_collateral);
        let debt_value = usd_value(position.debt_principal, price_debt);
        let health = if position.debt_principal <= 0 {
            HEALTH_MAX
        } else {
            health_factor(collateral_value, debt_value, LIQUIDATION_THRESHOLD_BPS)
        };
        let ltv_bps = if collateral_value > 0 {
            debt_value * BPS_DENOMINATOR / collateral_value
        } else {
            0
        };

        Ok(PositionView {
            collateral: position.collateral,
            debt: position.debt_principal,
            health_factor: health,
            ltv_bps,
            collateral_value_usd: collateral_value,
            debt_value_usd: debt_value,
            created_at: position.created_at,
            last_accrued: position.last_accrued,
        })
    }

    /// Seizes collateral from an unhealthy position and clears its debt.
    /// Callable only by the registered Liquidation contract, which is
    /// responsible for having already collected `debt_cleared` USDC from
    /// the liquidator into the Treasury in the same transaction.
    ///
    /// `repay_amount` is the exact amount of USDC the Liquidation contract
    /// has already transferred into the Treasury on the liquidator's
    /// behalf (see `contracts/liquidation`). It must cover the position's
    /// full current debt; any surplus (from the small buffer the caller
    /// pads onto the live-accruing debt figure to survive the gap between
    /// simulating and executing the transaction) is left in the Treasury
    /// as protocol liquidity rather than refunded, keeping this call free
    /// of any further auth-constrained token transfers.
    pub fn seize(
        env: Env,
        liquidator: Address,
        owner: Address,
        repay_amount: i128,
    ) -> Result<(i128, i128), VaultError> {
        let liquidation_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::LiquidationContract)
            .ok_or(VaultError::LiquidationContractNotSet)?;
        liquidation_contract.require_auth();

        let mut position = Self::load_existing_position(&env, &owner)?;
        Self::accrue(&env, &mut position);

        if position.debt_principal <= 0 {
            return Err(VaultError::NotLiquidatable);
        }
        if repay_amount < position.debt_principal {
            return Err(VaultError::InsufficientRepayment);
        }

        let (price_collateral, price_debt) = Self::prices(&env)?;
        let collateral_value = usd_value(position.collateral, price_collateral);
        let debt_value = usd_value(position.debt_principal, price_debt);
        let hf = health_factor(collateral_value, debt_value, LIQUIDATION_THRESHOLD_BPS);
        if hf >= HEALTH_SCALE {
            return Err(VaultError::NotLiquidatable);
        }

        let debt_cleared = position.debt_principal;
        let bonus_debt_value =
            debt_value * (BPS_DENOMINATOR + LIQUIDATION_BONUS_BPS) / BPS_DENOMINATOR;
        let mut collateral_seized = bonus_debt_value * math::PRICE_SCALE / price_collateral;
        if collateral_seized > position.collateral {
            collateral_seized = position.collateral;
        }

        position.debt_principal = 0;
        position.collateral -= collateral_seized;
        Self::save_position(&env, &owner, &position);

        let collateral_token = Self::get_addr(&env, &DataKey::CollateralToken)?;
        let client = token::Client::new(&env, &collateral_token);
        client.transfer(
            &env.current_contract_address(),
            &liquidator,
            &collateral_seized,
        );

        Seized {
            owner,
            liquidator,
            debt_cleared,
            collateral_seized,
        }
        .publish(&env);
        Ok((debt_cleared, collateral_seized))
    }

    // ---- internal helpers ----

    fn require_admin(env: &Env) -> Result<Address, VaultError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(VaultError::NotInitialized)
    }

    fn get_addr(env: &Env, key: &DataKey) -> Result<Address, VaultError> {
        env.storage()
            .instance()
            .get(key)
            .ok_or(VaultError::NotInitialized)
    }

    fn prices(env: &Env) -> Result<(i128, i128), VaultError> {
        let oracle_addr = Self::get_addr(env, &DataKey::Oracle)?;
        let oracle = OracleClient::new(env, &oracle_addr);
        let collateral_symbol: Symbol = env
            .storage()
            .instance()
            .get(&DataKey::CollateralSymbol)
            .ok_or(VaultError::NotInitialized)?;
        let borrow_symbol: Symbol = env
            .storage()
            .instance()
            .get(&DataKey::BorrowSymbol)
            .ok_or(VaultError::NotInitialized)?;
        let price_collateral = oracle.get_price(&collateral_symbol);
        let price_debt = oracle.get_price(&borrow_symbol);
        Ok((price_collateral, price_debt))
    }

    fn load_position(env: &Env, user: &Address) -> Position {
        env.storage()
            .persistent()
            .get(&DataKey::Position(user.clone()))
            .unwrap_or(Position {
                collateral: 0,
                debt_principal: 0,
                created_at: 0,
                last_accrued: 0,
            })
    }

    fn load_existing_position(env: &Env, user: &Address) -> Result<Position, VaultError> {
        env.storage()
            .persistent()
            .get(&DataKey::Position(user.clone()))
            .ok_or(VaultError::NoPosition)
    }

    fn register_user(env: &Env, user: &Address) {
        let mut users: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::UserList)
            .unwrap_or(Vec::new(env));
        if !users.contains(user) {
            users.push_back(user.clone());
            env.storage().instance().set(&DataKey::UserList, &users);
        }
    }

    fn save_position(env: &Env, user: &Address, position: &Position) {
        env.storage()
            .persistent()
            .set(&DataKey::Position(user.clone()), position);
        env.storage().persistent().extend_ttl(
            &DataKey::Position(user.clone()),
            1_555_200 - 20_000,
            1_555_200,
        );
    }

    /// Rolls accrued interest into `position.debt_principal` and records
    /// the interest as protocol fee revenue in the Treasury.
    fn accrue(env: &Env, position: &mut Position) {
        let now = env.ledger().timestamp();
        if position.last_accrued == 0 {
            position.last_accrued = now;
            return;
        }
        let (new_principal, interest_delta) = accrue_interest(
            position.debt_principal,
            position.last_accrued,
            now,
            INTEREST_RATE_BPS,
        );
        position.debt_principal = new_principal;
        position.last_accrued = now;

        // Always call the Treasury, even when interest_delta is 0. The
        // elapsed time (and therefore interest_delta) can differ between
        // when a transaction is simulated (to compute its storage
        // footprint) and when it actually executes on-chain -- if this
        // call were conditional, a value that simulates as 0 but accrues
        // to >0 by execution time would make the transaction touch the
        // Treasury's contract instance outside of its precomputed
        // footprint, and fail. Calling unconditionally keeps the
        // footprint identical regardless of timing.
        if let Ok(treasury) = Self::get_addr(env, &DataKey::Treasury) {
            let treasury_client = TreasuryClient::new(env, &treasury);
            treasury_client.record_fee(&interest_delta);
        }
    }

    /// Same interest math as `accrue` but read-only (no storage writes,
    /// no treasury call) -- used by view functions.
    fn accrue_view(env: &Env, position: &mut Position) {
        let now = env.ledger().timestamp();
        if position.last_accrued == 0 {
            return;
        }
        let (new_principal, _) = accrue_interest(
            position.debt_principal,
            position.last_accrued,
            now,
            INTEREST_RATE_BPS,
        );
        position.debt_principal = new_principal;
    }
}
