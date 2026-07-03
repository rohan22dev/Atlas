//! Minimal cross-contract call interfaces for the Oracle and Treasury
//! contracts. Deliberately declared here (rather than depending on the
//! `atlas-oracle` / `atlas-treasury` crates directly) so that the Vault's
//! compiled wasm only contains its own exported functions -- pulling in a
//! sibling contract crate as a normal dependency would also link its
//! `#[contractimpl]`-generated exports into this contract's binary and
//! collide with them. `#[contractclient]` generates a thin `Client` that
//! calls the deployed contract by address at runtime, with no such
//! collision.

use soroban_sdk::{contractclient, Address, Env, Symbol};

#[contractclient(name = "OracleClient")]
pub trait OracleInterface {
    fn get_price(env: Env, asset: Symbol) -> i128;
}

#[contractclient(name = "TreasuryClient")]
pub trait TreasuryInterface {
    fn disburse(env: Env, to: Address, amount: i128);
    fn record_fee(env: Env, amount: i128) -> i128;
}
