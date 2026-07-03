//! Atlas Liquidation Contract
//!
//! Orchestrates liquidations of unhealthy Vault positions (health factor
//! below 1.0). A liquidator repays the position's outstanding USDC debt
//! into the Treasury, and in the same atomic transaction receives the
//! position's collateral plus a 5% bonus from the Vault. If the debt
//! transfer fails (insufficient liquidator balance/allowance), the whole
//! transaction reverts and no collateral moves -- there is no code path
//! where collateral is seized without the debt actually being repaid.

#![no_std]

mod clients;
#[cfg(test)]
mod test;

use clients::VaultClient;
use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env};

/// Health factor scale, matching the Vault contract: 1.0 == 10_000_000.
pub const HEALTH_SCALE: i128 = 10_000_000;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Vault,
    Treasury,
    BorrowToken,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum LiquidationError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotLiquidatable = 3,
    NoDebt = 4,
}

#[contractevent(topics = ["liquidation_executed"])]
pub struct LiquidationExecuted {
    #[topic]
    pub owner: Address,
    #[topic]
    pub liquidator: Address,
    pub debt_repaid: i128,
    pub collateral_seized: i128,
}

#[contract]
pub struct LiquidationContract;

#[contractimpl]
impl LiquidationContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        vault: Address,
        treasury: Address,
        borrow_token: Address,
    ) -> Result<(), LiquidationError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(LiquidationError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::BorrowToken, &borrow_token);
        Ok(())
    }

    /// Returns whether `user`'s vault is currently below the liquidation
    /// threshold (health factor < 1.0).
    pub fn is_liquidatable(env: Env, user: Address) -> Result<bool, LiquidationError> {
        let vault = Self::get_addr(&env, &DataKey::Vault)?;
        let vault_client = VaultClient::new(&env, &vault);
        Ok(vault_client.calculate_health(&user) < HEALTH_SCALE)
    }

    /// Executes a liquidation of `owner`'s position. The caller
    /// (`liquidator`) must authorize this call and must hold enough
    /// borrow-asset (USDC) balance to cover the position's full
    /// outstanding debt, which is transferred to the Treasury before any
    /// collateral moves. In return the liquidator receives the position's
    /// collateral plus the protocol's 5% liquidation bonus.
    pub fn liquidate(env: Env, liquidator: Address, owner: Address) -> Result<(i128, i128), LiquidationError> {
        liquidator.require_auth();

        let vault = Self::get_addr(&env, &DataKey::Vault)?;
        let vault_client = VaultClient::new(&env, &vault);

        let health = vault_client.calculate_health(&owner);
        if health >= HEALTH_SCALE {
            return Err(LiquidationError::NotLiquidatable);
        }

        let debt = vault_client.get_debt(&owner);
        if debt <= 0 {
            return Err(LiquidationError::NoDebt);
        }

        let borrow_token = Self::get_addr(&env, &DataKey::BorrowToken)?;
        let treasury = Self::get_addr(&env, &DataKey::Treasury)?;
        let token_client = token::Client::new(&env, &borrow_token);
        token_client.transfer(&liquidator, &treasury, &debt);

        let (debt_repaid, collateral_seized) = vault_client.seize(&liquidator, &owner);

        LiquidationExecuted {
            owner,
            liquidator,
            debt_repaid,
            collateral_seized,
        }
        .publish(&env);

        Ok((debt_repaid, collateral_seized))
    }

    pub fn get_vault(env: Env) -> Result<Address, LiquidationError> {
        Self::get_addr(&env, &DataKey::Vault)
    }

    pub fn get_treasury(env: Env) -> Result<Address, LiquidationError> {
        Self::get_addr(&env, &DataKey::Treasury)
    }

    fn get_addr(env: &Env, key: &DataKey) -> Result<Address, LiquidationError> {
        env.storage().instance().get(key).ok_or(LiquidationError::NotInitialized)
    }
}
