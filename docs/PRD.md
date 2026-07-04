# Atlas — Product Requirements Document

## Problem

Crypto holders who need cash flexibility usually have to sell their assets, giving up future upside. Overcollateralized
lending lets them borrow against what they hold instead. Stellar has fast, cheap settlement and a growing Soroban
smart contract ecosystem, but lacked a simple, understandable lending protocol reference implementation.

## Goal

Ship a complete, working MVP of an overcollateralized lending protocol on Stellar Testnet that feels like a
simplified Aave/MakerDAO: deposit collateral, borrow a stablecoin, repay, withdraw, and get liquidated if unhealthy
— with a premium, modern frontend and no shortcuts (no mock data, no placeholder pages, no fake APIs).

## Target user

Someone experimenting with Stellar DeFi — a developer evaluating Soroban, or a user learning how overcollateralized
lending works — who wants to try the full loop with test assets and see real on-chain state changes.

## Core user stories

1. As a user, I can connect a Testnet wallet (Freighter, xBull, or Lobstr) and see my portfolio.
2. As a user, I can deposit XLM as collateral into my vault.
3. As a user, I can borrow USDC against my collateral, up to 60% loan-to-value, with live feedback on my
   resulting health factor and liquidation price before I confirm.
4. As a user, I can repay some or all of my USDC debt at any time.
5. As a user, I can withdraw collateral, as long as doing so keeps my vault above the 80% liquidation threshold.
6. As a user, I can see my vault's collateral, debt, LTV, liquidation price, interest rate, and health factor at
   a glance, plus my recent activity and historical charts.
7. As any user, I can see every vault that has fallen below a 1.0 health factor on the Liquidation Market page,
   and liquidate one in exchange for a 5% collateral bonus.
8. As the protocol admin, I can update the XLM/USD oracle price (this MVP uses an admin-pushed price feed,
   simulating market moves for demo purposes).
9. As a user, I can see protocol-wide stats: total value locked, total borrowed, utilization, and fees earned.
10. As a user, I can claim test XLM (via Friendbot) and test USDC (via an on-chain permissionless faucet) to try
    the app without needing to source testnet assets elsewhere.

## Non-goals (for this MVP)

- Real mainnet value / real USDC — everything is Testnet and test assets.
- Multiple collateral or borrow assets beyond XLM/USDC (BTC/ETH are stubbed in the UI as "coming soon").
- Partial liquidations (Atlas liquidates a vault's full outstanding debt in one call).
- A decentralized oracle (the interface is designed so one could be swapped in later without contract changes).
- Variable/utilization-based interest rates (a fixed 5% simple annual rate is used).

## Protocol parameters

| Parameter | Value |
|---|---|
| Max LTV at origination | 60% |
| Liquidation threshold | 80% |
| Liquidation bonus | 5% |
| Borrow interest | 5% simple annual |
| Collateral asset | XLM |
| Borrow asset | Atlas Test USDC |

## Success criteria

- A user can go from "no wallet connected" to "deposited, borrowed, repaid, and withdrawn" without leaving the app.
- An admin can crash the XLM price, watch a vault become unhealthy in the Liquidation Market, and a second wallet
  can successfully liquidate it and receive the bonus — end to end, on real Testnet infrastructure.
- Every page in the spec (Landing, Dashboard, Deposit, Borrow, Repay, Withdraw, Vault Details, Liquidation Market,
  Protocol Stats, Settings, 404) is implemented and functional, not a placeholder.
