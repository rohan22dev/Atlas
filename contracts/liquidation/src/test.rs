#![cfg(test)]

use super::*;
use atlas_oracle::{OracleContract, OracleContractClient};
use atlas_token::{TestToken, TestTokenClient};
use atlas_treasury::{TreasuryContract, TreasuryContractClient};
use atlas_vault::{VaultContract, VaultContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, String, Symbol};

const XLM: &str = "XLM";
const USDC: &str = "USDC";

#[allow(dead_code)]
struct TestCtx<'a> {
    env: Env,
    liquidation: LiquidationContractClient<'a>,
    vault: VaultContractClient<'a>,
    oracle: OracleContractClient<'a>,
    treasury: TreasuryContractClient<'a>,
    xlm: TestTokenClient<'a>,
    usdc: TestTokenClient<'a>,
    admin: Address,
}

fn setup() -> TestCtx<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);

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
    treasury.set_vault(&vault_id);

    let liquidation_id = env.register(LiquidationContract, ());
    let liquidation = LiquidationContractClient::new(&env, &liquidation_id);
    liquidation.initialize(&admin, &vault_id, &treasury_id, &usdc_id);
    vault.set_liquidation_contract(&liquidation_id);

    usdc.mint(&admin, &1_000_000_0000000);
    treasury.fund(&admin, &1_000_000_0000000);

    TestCtx {
        env,
        liquidation,
        vault,
        oracle,
        treasury,
        xlm,
        usdc,
        admin,
    }
}

#[test]
fn test_full_liquidation_flow() {
    let ctx = setup();
    let user = Address::generate(&ctx.env);
    ctx.xlm.mint(&user, &10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &600_0000000); // max LTV at $0.10 XLM

    // XLM price crashes -> position becomes liquidatable.
    ctx.oracle.update_price(&Symbol::new(&ctx.env, XLM), &700_000); // $0.07
    assert!(ctx.liquidation.is_liquidatable(&user));

    let liquidator = Address::generate(&ctx.env);
    ctx.usdc.mint(&liquidator, &1_000_0000000);

    let liquidator_xlm_before = ctx.xlm.balance(&liquidator);
    let (debt_repaid, collateral_seized) = ctx.liquidation.liquidate(&liquidator, &user, &600_0000000);

    assert_eq!(debt_repaid, 600_0000000);
    assert!(collateral_seized > 0);
    assert_eq!(ctx.xlm.balance(&liquidator), liquidator_xlm_before + collateral_seized);

    // Liquidator paid the debt into the treasury.
    assert_eq!(ctx.usdc.balance(&liquidator), 1_000_0000000 - 600_0000000);

    // Owner's debt is cleared.
    let position = ctx.vault.get_position(&user);
    assert_eq!(position.debt_principal, 0);

    // Bonus math: debt value $42 ($600 debt * 0.07 price ratio adj -- just
    // check the seized value reflects the 5% bonus over raw debt value).
    // debt_value = 600 * $1.00 = $600; with 5% bonus = $630 worth of XLM
    // at $0.07 = 9000 XLM (capped at available collateral of 10,000 XLM).
    assert_eq!(collateral_seized, 9_000_0000000);
}

#[test]
fn test_liquidate_healthy_position_rejected() {
    let ctx = setup();
    let user = Address::generate(&ctx.env);
    ctx.xlm.mint(&user, &10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &100_0000000); // very healthy

    let liquidator = Address::generate(&ctx.env);
    ctx.usdc.mint(&liquidator, &1_000_0000000);

    let result = ctx.liquidation.try_liquidate(&liquidator, &user, &100_0000000);
    assert!(result.is_err());
}

#[test]
fn test_liquidate_insufficient_liquidator_balance_reverts_atomically() {
    let ctx = setup();
    let user = Address::generate(&ctx.env);
    ctx.xlm.mint(&user, &10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &600_0000000);
    ctx.oracle.update_price(&Symbol::new(&ctx.env, XLM), &700_000);

    // Liquidator has no USDC at all.
    let liquidator = Address::generate(&ctx.env);
    let result = ctx.liquidation.try_liquidate(&liquidator, &user, &600_0000000);
    assert!(result.is_err());

    // Position must be untouched -- debt still outstanding, no collateral
    // moved, proving the token transfer failure reverted the whole tx.
    let position = ctx.vault.get_position(&user);
    assert_eq!(position.debt_principal, 600_0000000);
    assert_eq!(position.collateral, 10_000_0000000);
}

#[test]
fn test_liquidate_with_insufficient_repay_amount_rejected() {
    let ctx = setup();
    let user = Address::generate(&ctx.env);
    ctx.xlm.mint(&user, &10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &600_0000000);
    ctx.oracle.update_price(&Symbol::new(&ctx.env, XLM), &700_000);

    let liquidator = Address::generate(&ctx.env);
    ctx.usdc.mint(&liquidator, &1_000_0000000);

    // Liquidator only offers to repay half the debt.
    let result = ctx.liquidation.try_liquidate(&liquidator, &user, &300_0000000);
    assert!(result.is_err());

    let position = ctx.vault.get_position(&user);
    assert_eq!(position.debt_principal, 600_0000000);
}

#[test]
fn test_is_liquidatable_reflects_health() {
    let ctx = setup();
    let user = Address::generate(&ctx.env);
    ctx.xlm.mint(&user, &10_000_0000000);
    ctx.vault.deposit(&user, &10_000_0000000);
    ctx.vault.borrow(&user, &600_0000000);

    assert!(!ctx.liquidation.is_liquidatable(&user));
    ctx.oracle.update_price(&Symbol::new(&ctx.env, XLM), &700_000);
    assert!(ctx.liquidation.is_liquidatable(&user));
}

#[test]
fn test_double_initialize_fails() {
    let ctx = setup();
    let result = ctx.liquidation.try_initialize(
        &ctx.admin,
        &ctx.admin,
        &ctx.admin,
        &ctx.admin,
    );
    assert!(result.is_err());
}
