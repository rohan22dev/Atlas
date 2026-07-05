//! Atlas Treasury Contract
//!
//! Custodies the protocol's USDC liquidity. Users' borrowed USDC is paid
//! out of this contract, and repayments (principal + interest) flow back
//! into it. Only the registered Vault contract may trigger `disburse`
//! (verified via Soroban's implicit contract-auth: a contract address
//! satisfies `require_auth()` when it is the direct caller of the
//! invocation, no signature needed). Only the admin may sweep funds out
//! for treasury management.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Vault,
    Token,
    TotalFees,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TreasuryError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotAdmin = 3,
    NotVault = 4,
    VaultNotSet = 5,
    InvalidAmount = 6,
    InsufficientLiquidity = 7,
}

#[contractevent(topics = ["funded"])]
pub struct Funded {
    #[topic]
    pub from: Address,
    pub amount: i128,
}

#[contractevent(topics = ["disbursed"])]
pub struct Disbursed {
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent(topics = ["fees_collected"])]
pub struct FeesCollected {
    pub amount: i128,
    pub total_fees: i128,
}

#[contractevent(topics = ["withdrawn"])]
pub struct Withdrawn {
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    /// Initializes the treasury with an admin and the USDC token address.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), TreasuryError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(TreasuryError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::TotalFees, &0i128);
        Ok(())
    }

    /// Registers the Vault contract that is permitted to call `disburse`
    /// and `record_fee`. Admin-only; may be called once to wire up the
    /// two contracts after both are deployed.
    pub fn set_vault(env: Env, vault: Address) -> Result<(), TreasuryError> {
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Vault, &vault);
        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, TreasuryError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(TreasuryError::NotInitialized)
    }

    pub fn get_vault(env: Env) -> Result<Address, TreasuryError> {
        env.storage()
            .instance()
            .get(&DataKey::Vault)
            .ok_or(TreasuryError::VaultNotSet)
    }

    pub fn get_token(env: Env) -> Result<Address, TreasuryError> {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(TreasuryError::NotInitialized)
    }

    /// Adds USDC liquidity to the treasury. Callable by anyone (the admin
    /// seeds initial liquidity; in a future version third-party liquidity
    /// providers could earn a share of interest for supplying here).
    pub fn fund(env: Env, from: Address, amount: i128) -> Result<(), TreasuryError> {
        if amount <= 0 {
            return Err(TreasuryError::InvalidAmount);
        }
        from.require_auth();
        let token_id = Self::get_token(env.clone())?;
        let client = token::Client::new(&env, &token_id);
        client.transfer(&from, &env.current_contract_address(), &amount);
        Funded { from, amount }.publish(&env);
        Ok(())
    }

    /// Pays out borrowed USDC to a borrower. Only callable by the
    /// registered Vault contract.
    pub fn disburse(env: Env, to: Address, amount: i128) -> Result<(), TreasuryError> {
        if amount <= 0 {
            return Err(TreasuryError::InvalidAmount);
        }
        let vault = Self::get_vault(env.clone())?;
        vault.require_auth();

        let token_id = Self::get_token(env.clone())?;
        let client = token::Client::new(&env, &token_id);
        let balance = client.balance(&env.current_contract_address());
        if balance < amount {
            return Err(TreasuryError::InsufficientLiquidity);
        }
        client.transfer(&env.current_contract_address(), &to, &amount);
        Disbursed { to, amount }.publish(&env);
        Ok(())
    }

    /// Records protocol interest fees that have already landed in the
    /// treasury's token balance (the borrower transfers principal +
    /// interest directly to the treasury on repay). Only callable by the
    /// registered Vault contract. Pure bookkeeping -- does not move funds.
    pub fn record_fee(env: Env, amount: i128) -> Result<i128, TreasuryError> {
        if amount < 0 {
            return Err(TreasuryError::InvalidAmount);
        }
        let vault = Self::get_vault(env.clone())?;
        vault.require_auth();

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalFees)
            .unwrap_or(0);
        let new_total = total.checked_add(amount).expect("fee overflow");
        env.storage()
            .instance()
            .set(&DataKey::TotalFees, &new_total);
        FeesCollected {
            amount,
            total_fees: new_total,
        }
        .publish(&env);
        Ok(new_total)
    }

    /// Admin sweep, e.g. for treasury rebalancing. Restricted to admin.
    pub fn withdraw(env: Env, to: Address, amount: i128) -> Result<(), TreasuryError> {
        if amount <= 0 {
            return Err(TreasuryError::InvalidAmount);
        }
        let admin = Self::get_admin(env.clone())?;
        admin.require_auth();

        let token_id = Self::get_token(env.clone())?;
        let client = token::Client::new(&env, &token_id);
        let balance = client.balance(&env.current_contract_address());
        if balance < amount {
            return Err(TreasuryError::InsufficientLiquidity);
        }
        client.transfer(&env.current_contract_address(), &to, &amount);
        Withdrawn { to, amount }.publish(&env);
        Ok(())
    }

    /// Current USDC balance held by the treasury.
    pub fn get_balance(env: Env) -> Result<i128, TreasuryError> {
        let token_id = Self::get_token(env.clone())?;
        let client = token::Client::new(&env, &token_id);
        Ok(client.balance(&env.current_contract_address()))
    }

    pub fn get_total_fees(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalFees)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
