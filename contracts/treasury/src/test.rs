#![cfg(test)]

use super::*;
use atlas_token::{TestToken, TestTokenClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, String};

#[allow(dead_code)]
struct TestCtx {
    env: Env,
    treasury: TreasuryContractClient<'static>,
    token: TestTokenClient<'static>,
    admin: Address,
    vault: Address,
}

fn setup() -> TestCtx {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vault = Address::generate(&env);

    let token_id = env.register(TestToken, ());
    let token = TestTokenClient::new(&env, &token_id);
    token.initialize(
        &admin,
        &7,
        &String::from_str(&env, "Atlas USD Coin"),
        &String::from_str(&env, "USDC"),
    );

    let treasury_id = env.register(TreasuryContract, ());
    let treasury = TreasuryContractClient::new(&env, &treasury_id);
    treasury.initialize(&admin, &token_id);
    treasury.set_vault(&vault);

    TestCtx {
        env,
        treasury,
        token,
        admin,
        vault,
    }
}

#[test]
fn test_fund_increases_balance() {
    let ctx = setup();
    ctx.token.mint(&ctx.admin, &10_000_0000000);
    ctx.treasury.fund(&ctx.admin, &5_000_0000000);
    assert_eq!(ctx.treasury.get_balance(), 5_000_0000000);
}

#[test]
fn test_disburse_by_vault() {
    let ctx = setup();
    ctx.token.mint(&ctx.admin, &10_000_0000000);
    ctx.treasury.fund(&ctx.admin, &5_000_0000000);

    let borrower = Address::generate(&ctx.env);
    ctx.treasury.disburse(&borrower, &1_000_0000000);
    assert_eq!(ctx.token.balance(&borrower), 1_000_0000000);
    assert_eq!(ctx.treasury.get_balance(), 4_000_0000000);
}

#[test]
fn test_disburse_insufficient_liquidity_fails() {
    let ctx = setup();
    let borrower = Address::generate(&ctx.env);
    let result = ctx.treasury.try_disburse(&borrower, &1_000_0000000);
    assert!(result.is_err());
}

#[test]
fn test_record_fee_accumulates() {
    let ctx = setup();
    ctx.treasury.record_fee(&100);
    ctx.treasury.record_fee(&50);
    assert_eq!(ctx.treasury.get_total_fees(), 150);
}

#[test]
fn test_admin_withdraw() {
    let ctx = setup();
    ctx.token.mint(&ctx.admin, &10_000_0000000);
    ctx.treasury.fund(&ctx.admin, &5_000_0000000);

    let recipient = Address::generate(&ctx.env);
    ctx.treasury.withdraw(&recipient, &2_000_0000000);
    assert_eq!(ctx.token.balance(&recipient), 2_000_0000000);
    assert_eq!(ctx.treasury.get_balance(), 3_000_0000000);
}

#[test]
fn test_double_initialize_fails() {
    let ctx = setup();
    let result = ctx.treasury.try_initialize(&ctx.admin, &ctx.admin);
    assert!(result.is_err());
}

#[test]
fn test_invalid_amount_rejected() {
    let ctx = setup();
    let result = ctx.treasury.try_fund(&ctx.admin, &0);
    assert!(result.is_err());
    let result = ctx.treasury.try_fund(&ctx.admin, &-100);
    assert!(result.is_err());
}
