//! Atlas Oracle Contract
//!
//! Stores USD prices (7 decimal fixed point, matching Stellar's stroop
//! convention) for assets used by the Atlas lending protocol. Only the
//! configured admin may push price updates. This is intentionally simple
//! for the MVP -- a future version can replace the admin-push model with a
//! decentralized price feed (e.g. Reflector) without changing the external
//! interface (`get_price` / `update_price`).

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env, Symbol,
};

/// Fixed point scale used for all prices: 7 decimal places.
pub const PRICE_DECIMALS: u32 = 7;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Price(Symbol),
    UpdatedAt(Symbol),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum OracleError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotAdmin = 3,
    InvalidPrice = 4,
    PriceNotSet = 5,
}

/// Emitted whenever an admin updates an asset price.
#[contractevent(topics = ["oracle_updated"])]
pub struct OracleUpdated {
    #[topic]
    pub asset: Symbol,
    pub price: i128,
    pub timestamp: u64,
}

/// Emitted when the admin address is rotated.
#[contractevent(topics = ["admin_updated"])]
pub struct AdminUpdated {
    pub previous_admin: Address,
    pub new_admin: Address,
}

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    /// One-time initialization. Sets the admin address that is authorized
    /// to push price updates.
    pub fn initialize(env: Env, admin: Address) -> Result<(), OracleError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(OracleError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Returns the current admin address.
    pub fn get_admin(env: Env) -> Result<Address, OracleError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(OracleError::NotInitialized)
    }

    /// Rotates the admin address. Must be called by the current admin.
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), OracleError> {
        let admin: Address = Self::get_admin(env.clone())?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        AdminUpdated {
            previous_admin: admin,
            new_admin,
        }
        .publish(&env);
        Ok(())
    }

    /// Pushes a new price for `asset`, expressed as a fixed point integer
    /// with `PRICE_DECIMALS` (7) decimal places. For example, an XLM price
    /// of $0.12 is represented as `1_200_000`.
    pub fn update_price(env: Env, asset: Symbol, price: i128) -> Result<(), OracleError> {
        if price <= 0 {
            return Err(OracleError::InvalidPrice);
        }
        let admin: Address = Self::get_admin(env.clone())?;
        admin.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::Price(asset.clone()), &price);
        let now = env.ledger().timestamp();
        env.storage()
            .instance()
            .set(&DataKey::UpdatedAt(asset.clone()), &now);

        OracleUpdated {
            asset,
            price,
            timestamp: now,
        }
        .publish(&env);
        Ok(())
    }

    /// Returns the latest price for `asset` in 7-decimal fixed point USD.
    pub fn get_price(env: Env, asset: Symbol) -> Result<i128, OracleError> {
        env.storage()
            .instance()
            .get(&DataKey::Price(asset))
            .ok_or(OracleError::PriceNotSet)
    }

    /// Returns the ledger timestamp of the last update for `asset`.
    pub fn get_updated_at(env: Env, asset: Symbol) -> Result<u64, OracleError> {
        env.storage()
            .instance()
            .get(&DataKey::UpdatedAt(asset))
            .ok_or(OracleError::PriceNotSet)
    }
}

#[cfg(test)]
mod test;
