# Roadmap

Atlas is a complete MVP. These are the natural next steps toward a production-grade protocol.

## Near term

- **Decentralized oracle.** Swap the admin-pushed Oracle contract for a real feed (e.g. Reflector on Stellar)
  behind the same `get_price`/`update_price` interface.
- **Additional collateral assets.** Wire up BTC and ETH (already stubbed in the frontend's asset selector) once
  suitable wrapped/bridged representations exist on Stellar, generalizing the Vault to support a list of
  collateral assets instead of a single hardcoded one.
- **Partial liquidations.** Let a liquidator repay only part of a vault's debt and receive a proportional
  collateral bonus, rather than requiring a full liquidation.
- **Supply-side yield.** Let third parties deposit into the Treasury and earn a share of borrower interest,
  turning the Treasury into a real money market rather than an admin-seeded pool.

## Medium term

- **Variable interest rates.** Move from a fixed 5% rate to a utilization-curve model (rates rise as treasury
  utilization increases), the standard Aave/Compound approach.
- **Governance.** Replace the single admin key with a multisig or DAO-style governance contract for protocol
  parameter changes (LTV, liquidation threshold/bonus, interest rate).
- **Mainnet deployment path.** A formal third-party security audit, a real USDC integration (via Circle's
  Stellar support or an equivalent), and a mainnet deployment runbook.
- **Cross-margin vaults.** Allow a single vault to hold multiple collateral asset types simultaneously.

## Longer term

- **Flash loans.** Uncollateralized, same-transaction borrows for arbitrage/liquidation bots, a common
  companion feature in mature lending protocols.
- **Isolated / risk-tiered markets.** Separate risk parameters per collateral asset (higher LTV for stable
  assets, lower for volatile ones) rather than one global LTV/threshold pair.
- **Mobile app.** A native mobile client using the same contract layer, for users who prefer not to use a
  browser extension wallet.
