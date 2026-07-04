//! Minimal cross-contract interface for the Vault contract. See
//! `atlas-vault`'s own `clients.rs` for why this is a hand-declared
//! interface rather than a direct crate dependency: importing the real
//! `atlas-vault` crate would also pull its `#[contractimpl]`-generated
//! wasm exports into this contract's binary and collide with our own.

use soroban_sdk::{contractclient, Address, Env};

#[contractclient(name = "VaultClient")]
pub trait VaultInterface {
    fn calculate_health(env: Env, user: Address) -> i128;
    fn get_debt(env: Env, user: Address) -> i128;
    fn seize(env: Env, liquidator: Address, owner: Address, repay_amount: i128) -> (i128, i128);
}
