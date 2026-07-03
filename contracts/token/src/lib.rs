//! Atlas Test Token Contract
//!
//! A SEP-41 compatible fungible token used on Testnet to represent USDC
//! within the Atlas protocol. Real USDC does not exist on Stellar Testnet
//! in a form that's freely mintable, so Atlas deploys its own test token
//! with an admin-gated `mint` function that doubles as a faucet. The
//! contract otherwise implements the exact same interface as the native
//! XLM Stellar Asset Contract, so the Vault contract can treat both
//! collateral (XLM) and the borrow asset (this token) identically via
//! `soroban_sdk::token::Client`.

#![no_std]

mod storage;
#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractevent, contractimpl, contracttype, symbol_short, Address, Env, String};
use storage::{
    extend_instance_ttl, has_admin, read_admin, read_allowance, read_balance, receive_balance,
    spend_allowance, spend_balance, write_admin, write_allowance,
};

#[derive(Clone)]
#[contracttype]
pub struct TokenMetadata {
    pub decimals: u32,
    pub name: String,
    pub symbol: String,
}

/// Amount minted per permissionless faucet claim: 1,000 tokens (7 decimals).
pub const FAUCET_AMOUNT: i128 = 1_000_0000000;
/// Minimum time between faucet claims for a single address, in seconds.
pub const FAUCET_COOLDOWN: u64 = 3_600;

#[contractevent(topics = ["transfer"])]
pub struct Transfer {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent(topics = ["mint"])]
pub struct Mint {
    #[topic]
    pub admin: Address,
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent(topics = ["burn"])]
pub struct Burn {
    #[topic]
    pub from: Address,
    pub amount: i128,
}

#[contractevent(topics = ["approve"])]
pub struct Approve {
    #[topic]
    pub from: Address,
    #[topic]
    pub spender: Address,
    pub amount: i128,
    pub expiration_ledger: u32,
}

#[contractevent(topics = ["faucet_claimed"])]
pub struct FaucetClaimed {
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[derive(Clone)]
#[contracttype]
enum FaucetKey {
    LastClaim(Address),
}

fn check_nonnegative_amount(amount: i128) {
    if amount < 0 {
        panic!("negative amount is not allowed");
    }
}

#[contract]
pub struct TestToken;

#[contractimpl]
impl TestToken {
    /// Initializes the token with an admin, decimals, name, and symbol.
    /// Can only be called once.
    pub fn initialize(env: Env, admin: Address, decimals: u32, name: String, symbol: String) {
        if has_admin(&env) {
            panic!("already initialized");
        }
        write_admin(&env, &admin);
        env.storage().instance().set(
            &symbol_short!("METADATA"),
            &TokenMetadata {
                decimals,
                name,
                symbol,
            },
        );
        extend_instance_ttl(&env);
    }

    /// Admin-only faucet mint. Used on Testnet to fund user wallets and the
    /// Treasury contract with test USDC.
    pub fn mint(env: Env, to: Address, amount: i128) {
        check_nonnegative_amount(amount);
        let admin = read_admin(&env);
        admin.require_auth();
        extend_instance_ttl(&env);
        receive_balance(&env, to.clone(), amount);
        Mint { admin, to, amount }.publish(&env);
    }

    /// Permissionless testnet faucet: any address may claim
    /// `FAUCET_AMOUNT` once per `FAUCET_COOLDOWN` seconds. This lets the
    /// Atlas frontend hand out test USDC without any privileged backend
    /// signer -- the caller simply authorizes the claim with their own
    /// wallet.
    pub fn faucet(env: Env, to: Address) -> i128 {
        to.require_auth();
        extend_instance_ttl(&env);

        let key = FaucetKey::LastClaim(to.clone());
        let now = env.ledger().timestamp();
        if let Some(last_claim) = env.storage().temporary().get::<_, u64>(&key) {
            if now < last_claim + FAUCET_COOLDOWN {
                panic!("faucet cooldown not elapsed");
            }
        }
        env.storage().temporary().set(&key, &now);
        env.storage()
            .temporary()
            .extend_ttl(&key, FAUCET_COOLDOWN as u32, FAUCET_COOLDOWN as u32);

        receive_balance(&env, to.clone(), FAUCET_AMOUNT);
        FaucetClaimed {
            to,
            amount: FAUCET_AMOUNT,
        }
        .publish(&env);
        FAUCET_AMOUNT
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let admin = read_admin(&env);
        admin.require_auth();
        extend_instance_ttl(&env);
        write_admin(&env, &new_admin);
    }

    pub fn admin(env: Env) -> Address {
        read_admin(&env)
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        extend_instance_ttl(&env);
        read_allowance(&env, from, spender).amount
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        check_nonnegative_amount(amount);
        extend_instance_ttl(&env);
        write_allowance(&env, from.clone(), spender.clone(), amount, expiration_ledger);
        Approve {
            from,
            spender,
            amount,
            expiration_ledger,
        }
        .publish(&env);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        extend_instance_ttl(&env);
        read_balance(&env, id)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        check_nonnegative_amount(amount);
        extend_instance_ttl(&env);
        spend_balance(&env, from.clone(), amount);
        receive_balance(&env, to.clone(), amount);
        Transfer { from, to, amount }.publish(&env);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        check_nonnegative_amount(amount);
        extend_instance_ttl(&env);
        spend_allowance(&env, from.clone(), spender, amount);
        spend_balance(&env, from.clone(), amount);
        receive_balance(&env, to.clone(), amount);
        Transfer { from, to, amount }.publish(&env);
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        check_nonnegative_amount(amount);
        extend_instance_ttl(&env);
        spend_balance(&env, from.clone(), amount);
        Burn { from, amount }.publish(&env);
    }

    pub fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        check_nonnegative_amount(amount);
        extend_instance_ttl(&env);
        spend_allowance(&env, from.clone(), spender, amount);
        spend_balance(&env, from.clone(), amount);
        Burn { from, amount }.publish(&env);
    }

    pub fn decimals(env: Env) -> u32 {
        Self::metadata(&env).decimals
    }

    pub fn name(env: Env) -> String {
        Self::metadata(&env).name
    }

    pub fn symbol(env: Env) -> String {
        Self::metadata(&env).symbol
    }

    fn metadata(env: &Env) -> TokenMetadata {
        env.storage()
            .instance()
            .get(&symbol_short!("METADATA"))
            .unwrap()
    }
}
