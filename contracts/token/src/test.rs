#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Env;

fn setup() -> (Env, TestTokenClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register(TestToken, ());
    let client = TestTokenClient::new(&env, &contract_id);
    client.initialize(
        &admin,
        &7,
        &String::from_str(&env, "Atlas USD Coin"),
        &String::from_str(&env, "USDC"),
    );
    (env, client, admin, user)
}

#[test]
fn test_mint_and_balance() {
    let (_env, client, _admin, user) = setup();
    client.mint(&user, &1_000_0000000);
    assert_eq!(client.balance(&user), 1_000_0000000);
}

#[test]
fn test_transfer() {
    let (env, client, _admin, user) = setup();
    let recipient = Address::generate(&env);
    client.mint(&user, &500_0000000);
    client.transfer(&user, &recipient, &200_0000000);
    assert_eq!(client.balance(&user), 300_0000000);
    assert_eq!(client.balance(&recipient), 200_0000000);
}

#[test]
fn test_transfer_insufficient_balance_fails() {
    let (env, client, _admin, user) = setup();
    let recipient = Address::generate(&env);
    client.mint(&user, &100);
    let result = client.try_transfer(&user, &recipient, &200);
    assert!(result.is_err());
}

#[test]
fn test_approve_and_transfer_from() {
    let (env, client, _admin, user) = setup();
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.mint(&user, &1000);
    client.approve(&user, &spender, &400, &(env.ledger().sequence() + 1000));
    assert_eq!(client.allowance(&user, &spender), 400);
    client.transfer_from(&spender, &user, &recipient, &300);
    assert_eq!(client.balance(&recipient), 300);
    assert_eq!(client.allowance(&user, &spender), 100);
}

#[test]
fn test_burn() {
    let (_env, client, _admin, user) = setup();
    client.mint(&user, &500);
    client.burn(&user, &200);
    assert_eq!(client.balance(&user), 300);
}

#[test]
fn test_mint_requires_admin_auth() {
    let (env, client, admin, user) = setup();
    client.mint(&user, &100);
    assert_eq!(
        env.auths()[0].0,
        admin
    );
}

#[test]
fn test_double_initialize_fails() {
    let (env, client, admin, _user) = setup();
    let result = client.try_initialize(
        &admin,
        &7,
        &String::from_str(&env, "X"),
        &String::from_str(&env, "X"),
    );
    assert!(result.is_err());
}

#[test]
fn test_metadata() {
    let (env, client, _admin, _user) = setup();
    assert_eq!(client.decimals(), 7);
    assert_eq!(client.name(), String::from_str(&env, "Atlas USD Coin"));
    assert_eq!(client.symbol(), String::from_str(&env, "USDC"));
}

#[test]
fn test_negative_amount_rejected() {
    let (_env, client, _admin, user) = setup();
    let result = client.try_mint(&user, &-10);
    assert!(result.is_err());
}
