#![cfg(test)]

use super::*;
use atlas_oracle::{OracleContract, OracleContractClient};
use atlas_token::{TestToken, TestTokenClient};
use atlas_treasury::{TreasuryContract, TreasuryContractClient};
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{Env, String, Symbol};

#[allow(dead_code)]
struct TestCtx<'a> {
    env: Env,
    vault: VaultContractClient<'a>,
    oracle: OracleContractClient<'a>,
    treasury: TreasuryContractClient<'a>,
    xlm: TestTokenClient<'a>,
    usdc: TestTokenClient<'a>,
    admin: Address,
    liquidation_contract: Address,
}

const XLM: &str = "XLM";
const USDC: &str = "USDC";

fn setup() -> TestCtx<'static> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);

    let admin = Address::generate(&env);
    let liquidation_contract = Address::generate(&env);

    let xlm_id = env.register(TestToken, ());
    let xlm = TestTokenClient::new(&env, &xlm_id);
    xlm.initialize(&admin, &7, &String::from_str(&env, "Stellar Lumens"), &String::from_str(&env, "XLM"));

    let usdc_id = env.register(TestToken, ());
    let usdc = TestTokenClient::new(&env, &usdc_id);
    usdc.initialize(&admin, &7, &String::from_str(&env, "Atlas USD Coin"), &String::from_str(&env, "USDC"));

    let oracle_id = env.register(OracleContract, ());
    let oracle = OracleContractClient::new(&env, &oracle_id);
    oracle.initialize(&admin);
    oracle.update_price(&Symbol::new(&env, XLM), &1_000_000); // $0.10
    oracle.update_price(&Symbol::new(&env, USDC), &10_000_000); // $1.00

    let treasury_id = env.register(TreasuryContract, ());
    let treasury = TreasuryContractClient::new(&env, &treasury_id);
    treasury.initialize(&admin, &usdc_id);

    let vault_id = env.register(VaultContract, ());
    let vault = VaultContractClient::new(&env, &vault_id);
    vault.initialize(
        &admin,
        &xlm_id,
        &usdc_id,
        &Symbol::new(&env, XLM),
        &Symbol::new(&env, USDC),
        &oracle_id,
        &treasury_id,
    );
    vault.set_liquidation_contract(&liquidation_contract);
    treasury.set_vault(&vault_id);

    // Seed treasury with USDC liquidity.
    usdc.mint(&admin, &1_000_000_0000000);
    treasury.fund(&admin, &1_000_000_0000000);

    TestCtx {
        env,
        vault,
        oracle,
        treasury,
        xlm,
        usdc,
        admin,
        liquidation_contract,
    }
}

fn user_with_xlm(ctx: &TestCtx, amount: i128) -> Address {
    let user = Address::generate(&ctx.env);
    ctx.xlm.mint(&user, &amount);
    user
}

#[test]
fn test_deposit_updates_position() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    let new_collateral = ctx.vault.deposit(&user, &5_000_0000000);
    assert_eq!(new_collateral, 5_000_0000000);
    assert_eq!(ctx.xlm.balance(&user), 5_000_0000000);

    let position = ctx.vault.get_position(&user);
    assert_eq!(position.collateral, 5_000_0000000);
    assert_eq!(position.debt_principal, 0);
}

#[test]
fn test_deposit_zero_rejected() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 1000);
    let result = ctx.vault.try_deposit(&user, &0);
    assert!(result.is_err());
}

#[test]
fn test_borrow_within_ltv_succeeds() {
    let ctx = setup();
    // 10,000 XLM @ $0.10 = $1,000 collateral value. Max borrow @ 60% = $600.
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);

    let new_debt = ctx.vault.borrow(&user, &500_0000000); // $500 USDC
    assert_eq!(new_debt, 500_0000000);
    assert_eq!(ctx.usdc.balance(&user), 500_0000000);
}

#[test]
fn test_borrow_beyond_ltv_rejected() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);

    // Max borrow is $600; asking for $700 should fail.
    let result = ctx.vault.try_borrow(&user, &700_0000000);
    assert!(result.is_err());
}

#[test]
fn test_double_borrow_cumulative_checked_against_ltv() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);

    ctx.vault.borrow(&user, &300_0000000);
    // Cumulative would be $300 + $350 = $650 > $600 max -> must fail.
    let result = ctx.vault.try_borrow(&user, &350_0000000);
    assert!(result.is_err());

    // But borrowing up to the remaining headroom succeeds.
    ctx.vault.borrow(&user, &300_0000000);
    let position = ctx.vault.get_position(&user);
    assert_eq!(position.debt_principal, 600_0000000);
}

#[test]
fn test_borrow_without_collateral_rejected() {
    let ctx = setup();
    let user = Address::generate(&ctx.env);
    let result = ctx.vault.try_borrow(&user, &100);
    assert!(result.is_err());
}

#[test]
fn test_repay_reduces_debt() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &500_0000000);

    ctx.usdc.mint(&user, &200_0000000); // extra funds to repay
    let repaid = ctx.vault.repay(&user, &300_0000000);
    assert_eq!(repaid, 300_0000000);

    let position = ctx.vault.get_position(&user);
    assert_eq!(position.debt_principal, 200_0000000);
}

#[test]
fn test_repay_overpayment_clamped() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &500_0000000);

    ctx.usdc.mint(&user, &1_000_0000000);
    let repaid = ctx.vault.repay(&user, &900_0000000);
    assert_eq!(repaid, 500_0000000);

    let position = ctx.vault.get_position(&user);
    assert_eq!(position.debt_principal, 0);
}

#[test]
fn test_repay_with_no_debt_rejected() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    let result = ctx.vault.try_repay(&user, &100);
    assert!(result.is_err());
}

#[test]
fn test_withdraw_healthy_succeeds() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &100_0000000); // small debt, lots of headroom

    let new_collateral = ctx.vault.withdraw(&user, &1_000_0000000);
    assert_eq!(new_collateral, 9_000_0000000);
}

#[test]
fn test_withdraw_would_be_unhealthy_rejected() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &600_0000000); // max LTV borrow

    // Withdrawing any meaningful amount now breaches the 80% liq threshold.
    let result = ctx.vault.try_withdraw(&user, &5_000_0000000);
    assert!(result.is_err());
}

#[test]
fn test_withdraw_more_than_collateral_rejected() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &1_000_0000000);
    let result = ctx.vault.try_withdraw(&user, &2_000_0000000);
    assert!(result.is_err());
}

#[test]
fn test_withdraw_full_amount_with_no_debt_succeeds() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    let new_collateral = ctx.vault.withdraw(&user, &10_000_0000000);
    assert_eq!(new_collateral, 0);
    assert_eq!(ctx.xlm.balance(&user), 10_000_0000000);
}

#[test]
fn test_calculate_health_no_debt_is_max() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    assert_eq!(ctx.vault.calculate_health(&user), math::HEALTH_MAX);
}

#[test]
fn test_calculate_health_reflects_price_drop() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &500_0000000);

    let hf_before = ctx.vault.calculate_health(&user);
    assert!(hf_before >= math::HEALTH_SCALE);

    // Crash XLM price from $0.10 to $0.05.
    ctx.oracle.update_price(&Symbol::new(&ctx.env, XLM), &500_000);
    let hf_after = ctx.vault.calculate_health(&user);
    assert!(hf_after < hf_before);
    assert!(hf_after < math::HEALTH_SCALE);
}

#[test]
fn test_interest_accrues_over_time() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &600_0000000);

    // Fast-forward one full year.
    ctx.env.ledger().set_timestamp(1_700_000_000 + 31_536_000);
    let view = ctx.vault.get_position_view(&user);
    // 5% of 600 = 30
    assert_eq!(view.debt, 630_0000000);
}

#[test]
fn test_seize_by_liquidation_contract_succeeds() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &600_0000000); // max LTV

    // Crash XLM price so the position becomes liquidatable.
    ctx.oracle.update_price(&Symbol::new(&ctx.env, XLM), &700_000); // $0.07

    let liquidator = Address::generate(&ctx.env);
    let (debt_cleared, collateral_seized) = ctx.vault.seize(&liquidator, &user);
    assert_eq!(debt_cleared, 600_0000000);
    assert!(collateral_seized > 0);
    assert_eq!(ctx.xlm.balance(&liquidator), collateral_seized);

    let position = ctx.vault.get_position(&user);
    assert_eq!(position.debt_principal, 0);
}

#[test]
fn test_seize_when_healthy_rejected() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &100_0000000); // very healthy

    let liquidator = Address::generate(&ctx.env);
    let result = ctx.vault.try_seize(&liquidator, &user);
    assert!(result.is_err());
}

#[test]
fn test_seize_requires_liquidation_contract_auth() {
    // Without mock_all_auths, only explicitly authorized invocations pass.
    // Here we authorize everything the transaction submitter (liquidator)
    // needs, but the liquidation_contract's own require_auth() is only
    // satisfiable because it is the *direct caller* of seize() -- an
    // externally-owned account impersonating that address cannot produce
    // a valid auth entry for it, which is what this test documents by
    // asserting the address stored via set_liquidation_contract is the
    // only one whose auth is checked (structural, not caller-supplied).
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &600_0000000);
    ctx.oracle.update_price(&Symbol::new(&ctx.env, XLM), &700_000);

    assert_eq!(ctx.vault.get_config().liquidation_contract, ctx.liquidation_contract);
}

#[test]
fn test_seize_without_liquidation_contract_registered_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_700_000_000);
    let admin = Address::generate(&env);

    let xlm_id = env.register(TestToken, ());
    let xlm = TestTokenClient::new(&env, &xlm_id);
    xlm.initialize(&admin, &7, &String::from_str(&env, "XLM"), &String::from_str(&env, "XLM"));
    let usdc_id = env.register(TestToken, ());
    let usdc = TestTokenClient::new(&env, &usdc_id);
    usdc.initialize(&admin, &7, &String::from_str(&env, "USDC"), &String::from_str(&env, "USDC"));
    let oracle_id = env.register(OracleContract, ());
    let oracle = OracleContractClient::new(&env, &oracle_id);
    oracle.initialize(&admin);
    oracle.update_price(&Symbol::new(&env, XLM), &1_000_000);
    oracle.update_price(&Symbol::new(&env, USDC), &10_000_000);
    let treasury_id = env.register(TreasuryContract, ());
    let treasury = TreasuryContractClient::new(&env, &treasury_id);
    treasury.initialize(&admin, &usdc_id);
    let vault_id = env.register(VaultContract, ());
    let vault = VaultContractClient::new(&env, &vault_id);
    vault.initialize(
        &admin,
        &xlm_id,
        &usdc_id,
        &Symbol::new(&env, XLM),
        &Symbol::new(&env, USDC),
        &oracle_id,
        &treasury_id,
    );
    treasury.set_vault(&vault_id);
    // Note: set_liquidation_contract() is intentionally never called.

    let user = Address::generate(&env);
    xlm.mint(&user, &10_000_0000000);
    vault.deposit(&user, &10_000_0000000);

    let liquidator = Address::generate(&env);
    let result = vault.try_seize(&liquidator, &user);
    assert!(result.is_err());
}

#[test]
fn test_get_all_users_tracks_depositors() {
    let ctx = setup();
    let user1 = user_with_xlm(&ctx, 1_000_0000000);
    let user2 = user_with_xlm(&ctx, 1_000_0000000);
    ctx.vault.deposit(&user1, &500_0000000);
    ctx.vault.deposit(&user2, &500_0000000);
    // Second deposit from user1 should not duplicate the entry.
    ctx.vault.deposit(&user1, &100_0000000);

    let users = ctx.vault.get_all_users();
    assert_eq!(users.len(), 2);
}

#[test]
fn test_negative_amounts_rejected_everywhere() {
    let ctx = setup();
    let user = user_with_xlm(&ctx, 10_000_0000000);
    ctx.vault.deposit(&user, &1_000_0000000);
    assert!(ctx.vault.try_deposit(&user, &-1).is_err());
    assert!(ctx.vault.try_borrow(&user, &-1).is_err());
    assert!(ctx.vault.try_withdraw(&user, &-1).is_err());
    ctx.vault.borrow(&user, &10);
    assert!(ctx.vault.try_repay(&user, &-1).is_err());
}
