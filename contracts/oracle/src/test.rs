#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::Env;

fn setup() -> (Env, OracleContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(OracleContract, ());
    let client = OracleContractClient::new(&env, &contract_id);
    client.initialize(&admin);
    (env, client, admin)
}

#[test]
fn test_initialize_and_get_admin() {
    let (_env, client, admin) = setup();
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_double_initialize_fails() {
    let (env, client, admin) = setup();
    let _ = admin;
    let result = client.try_initialize(&Address::generate(&env));
    assert!(result.is_err());
}

#[test]
fn test_update_and_get_price() {
    let (env, client, _admin) = setup();
    let xlm = Symbol::new(&env, "XLM");
    client.update_price(&xlm, &1_200_000i128);
    assert_eq!(client.get_price(&xlm), 1_200_000i128);
}

#[test]
fn test_invalid_price_rejected() {
    let (env, client, _admin) = setup();
    let xlm = Symbol::new(&env, "XLM");
    let result = client.try_update_price(&xlm, &0i128);
    assert!(result.is_err());
    let result = client.try_update_price(&xlm, &-5i128);
    assert!(result.is_err());
}

#[test]
fn test_unset_price_errors() {
    let (env, client, _admin) = setup();
    let btc = Symbol::new(&env, "BTC");
    let result = client.try_get_price(&btc);
    assert!(result.is_err());
}

#[test]
fn test_admin_rotation() {
    let (env, client, admin) = setup();
    let _ = admin;
    let new_admin = Address::generate(&env);
    client.set_admin(&new_admin);
    assert_eq!(client.get_admin(), new_admin);
}

#[test]
fn test_updated_at_tracks_ledger_timestamp() {
    let (env, client, _admin) = setup();
    let xlm = Symbol::new(&env, "XLM");
    env.ledger().set_timestamp(12345);
    client.update_price(&xlm, &1_000_000i128);
    assert_eq!(client.get_updated_at(&xlm), 12345);
}
