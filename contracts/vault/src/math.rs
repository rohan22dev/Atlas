//! Fixed point math for interest accrual and health factor calculations.
//! All USD amounts and prices use 7 decimal places, matching Stellar's
//! stroop convention.

/// 1.0 in 7-decimal fixed point, used both for prices and health factor.
pub const PRICE_SCALE: i128 = 10_000_000;
pub const HEALTH_SCALE: i128 = 10_000_000;
/// Sentinel returned for a position with zero debt (health is unbounded).
pub const HEALTH_MAX: i128 = i128::MAX;

const BPS_DENOMINATOR: i128 = 10_000;
const SECONDS_PER_YEAR: i128 = 31_536_000;

/// USD value (7-decimal fixed point) of `amount` (7-decimal fixed point
/// token units) at `price` (7-decimal fixed point USD per whole unit).
pub fn usd_value(amount: i128, price: i128) -> i128 {
    amount
        .checked_mul(price)
        .and_then(|v| v.checked_div(PRICE_SCALE))
        .expect("usd_value overflow")
}

/// Health factor = (collateral_value * liquidation_threshold) / debt_value,
/// scaled by `HEALTH_SCALE`. A value >= HEALTH_SCALE (1.0) is healthy.
/// Callers must ensure `debt_value > 0` before calling.
pub fn health_factor(collateral_value: i128, debt_value: i128, liq_threshold_bps: i128) -> i128 {
    if debt_value <= 0 {
        return HEALTH_MAX;
    }
    let weighted_collateral = collateral_value
        .checked_mul(liq_threshold_bps)
        .expect("health_factor overflow")
        / BPS_DENOMINATOR;
    weighted_collateral
        .checked_mul(HEALTH_SCALE)
        .expect("health_factor overflow")
        / debt_value
}

/// Applies simple annual interest to `principal` for the elapsed time
/// between `last_accrued` and `now`. Returns `(new_principal, interest_delta)`.
pub fn accrue_interest(
    principal: i128,
    last_accrued: u64,
    now: u64,
    rate_bps: i128,
) -> (i128, i128) {
    if principal <= 0 || now <= last_accrued {
        return (principal, 0);
    }
    let elapsed = (now - last_accrued) as i128;
    let interest = principal
        .checked_mul(rate_bps)
        .and_then(|v| v.checked_mul(elapsed))
        .and_then(|v| v.checked_div(BPS_DENOMINATOR))
        .and_then(|v| v.checked_div(SECONDS_PER_YEAR))
        .expect("interest overflow");
    let new_principal = principal.checked_add(interest).expect("principal overflow");
    (new_principal, interest)
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_usd_value() {
        // 100 XLM at $0.12 => $12.00
        assert_eq!(usd_value(100 * PRICE_SCALE, 1_200_000), 12 * PRICE_SCALE);
    }

    #[test]
    fn test_health_factor_healthy() {
        // $1000 collateral, 80% threshold, $600 debt => HF = 800/600 = 1.333..
        let hf = health_factor(1000 * PRICE_SCALE, 600 * PRICE_SCALE, 8000);
        assert!(hf > HEALTH_SCALE);
    }

    #[test]
    fn test_health_factor_unhealthy() {
        // $1000 collateral, 80% threshold, $900 debt => HF = 800/900 = 0.888..
        let hf = health_factor(1000 * PRICE_SCALE, 900 * PRICE_SCALE, 8000);
        assert!(hf < HEALTH_SCALE);
    }

    #[test]
    fn test_health_factor_no_debt() {
        assert_eq!(health_factor(1000 * PRICE_SCALE, 0, 8000), HEALTH_MAX);
    }

    #[test]
    fn test_accrue_interest_one_year() {
        // $1000 principal, 5% annual, exactly one year elapsed => $50 interest
        let (new_principal, interest) =
            accrue_interest(1000 * PRICE_SCALE, 0, SECONDS_PER_YEAR as u64, 500);
        assert_eq!(interest, 50 * PRICE_SCALE);
        assert_eq!(new_principal, 1050 * PRICE_SCALE);
    }

    #[test]
    fn test_accrue_interest_zero_elapsed() {
        let (new_principal, interest) = accrue_interest(1000 * PRICE_SCALE, 100, 100, 500);
        assert_eq!(interest, 0);
        assert_eq!(new_principal, 1000 * PRICE_SCALE);
    }

    #[test]
    fn test_accrue_interest_zero_principal() {
        let (new_principal, interest) = accrue_interest(0, 0, SECONDS_PER_YEAR as u64, 500);
        assert_eq!(interest, 0);
        assert_eq!(new_principal, 0);
    }
}
