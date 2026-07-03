#!/usr/bin/env bash
# Deploys the full Atlas protocol (Oracle, Token, Treasury, Vault,
# Liquidation) to Stellar Testnet, wires the contracts together, seeds
# initial oracle prices and treasury liquidity, and writes the resulting
# contract addresses to deployed_addresses.json for the frontend to
# consume.
#
# Usage: ./scripts/deploy.sh
#
# Requires: stellar CLI, an `atlas-admin` identity (created + funded via
# `stellar keys generate atlas-admin --network testnet --fund`).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NETWORK="testnet"
ADMIN="atlas-admin"
ADMIN_ADDRESS="$(stellar keys address "$ADMIN")"
WASM_DIR="target/wasm32v1-none/release"

echo "==> Building contracts"
stellar contract build

echo "==> Admin address: $ADMIN_ADDRESS"

echo "==> Resolving native XLM Stellar Asset Contract id"
XLM_ID="$(stellar contract id asset --asset native --network "$NETWORK")"
echo "    XLM_ID=$XLM_ID"

deploy() {
  local wasm="$1"
  stellar contract deploy \
    --wasm "$WASM_DIR/$wasm" \
    --source-account "$ADMIN" \
    --network "$NETWORK" \
    2>/dev/null
}

echo "==> Deploying USDC test token"
USDC_ID="$(deploy atlas_token.wasm)"
echo "    USDC_ID=$USDC_ID"

echo "==> Deploying Oracle"
ORACLE_ID="$(deploy atlas_oracle.wasm)"
echo "    ORACLE_ID=$ORACLE_ID"

echo "==> Deploying Treasury"
TREASURY_ID="$(deploy atlas_treasury.wasm)"
echo "    TREASURY_ID=$TREASURY_ID"

echo "==> Deploying Vault"
VAULT_ID="$(deploy atlas_vault.wasm)"
echo "    VAULT_ID=$VAULT_ID"

echo "==> Deploying Liquidation"
LIQUIDATION_ID="$(deploy atlas_liquidation.wasm)"
echo "    LIQUIDATION_ID=$LIQUIDATION_ID"

invoke() {
  local id="$1"
  shift
  stellar contract invoke \
    --id "$id" \
    --source-account "$ADMIN" \
    --network "$NETWORK" \
    -- "$@"
}

echo "==> Initializing USDC token"
invoke "$USDC_ID" initialize \
  --admin "$ADMIN_ADDRESS" \
  --decimals 7 \
  --name "Atlas USD Coin" \
  --symbol "USDC"

echo "==> Initializing Oracle"
invoke "$ORACLE_ID" initialize --admin "$ADMIN_ADDRESS"

echo "==> Seeding initial oracle prices (XLM=\$0.10, USDC=\$1.00)"
invoke "$ORACLE_ID" update_price --asset XLM --price 1000000
invoke "$ORACLE_ID" update_price --asset USDC --price 10000000

echo "==> Initializing Treasury"
invoke "$TREASURY_ID" initialize --admin "$ADMIN_ADDRESS" --token "$USDC_ID"

echo "==> Initializing Vault"
invoke "$VAULT_ID" initialize \
  --admin "$ADMIN_ADDRESS" \
  --collateral_token "$XLM_ID" \
  --borrow_token "$USDC_ID" \
  --collateral_symbol XLM \
  --borrow_symbol USDC \
  --oracle "$ORACLE_ID" \
  --treasury "$TREASURY_ID"

echo "==> Initializing Liquidation"
invoke "$LIQUIDATION_ID" initialize \
  --admin "$ADMIN_ADDRESS" \
  --vault "$VAULT_ID" \
  --treasury "$TREASURY_ID" \
  --borrow_token "$USDC_ID"

echo "==> Wiring Treasury -> Vault"
invoke "$TREASURY_ID" set_vault --vault "$VAULT_ID"

echo "==> Wiring Vault -> Liquidation"
invoke "$VAULT_ID" set_liquidation_contract --liquidation_contract "$LIQUIDATION_ID"

echo "==> Minting initial USDC liquidity to admin (2,000,000 USDC)"
invoke "$USDC_ID" mint --to "$ADMIN_ADDRESS" --amount 20000000000000

echo "==> Funding Treasury with 1,000,000 USDC liquidity"
invoke "$TREASURY_ID" fund --from "$ADMIN_ADDRESS" --amount 10000000000000

OUT_FILE="deployed_addresses.json"
echo "==> Writing $OUT_FILE"
cat > "$OUT_FILE" <<EOF
{
  "network": "testnet",
  "networkPassphrase": "Test SDF Network ; September 2015",
  "rpcUrl": "https://soroban-testnet.stellar.org",
  "horizonUrl": "https://horizon-testnet.stellar.org",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "admin": "$ADMIN_ADDRESS",
  "contracts": {
    "xlmToken": "$XLM_ID",
    "usdcToken": "$USDC_ID",
    "oracle": "$ORACLE_ID",
    "treasury": "$TREASURY_ID",
    "vault": "$VAULT_ID",
    "liquidation": "$LIQUIDATION_ID"
  },
  "protocolParams": {
    "ltvBps": 6000,
    "liquidationThresholdBps": 8000,
    "liquidationBonusBps": 500,
    "interestRateBps": 500
  }
}
EOF

cp "$OUT_FILE" "web/public/deployed_addresses.json" 2>/dev/null || true

echo ""
echo "==> Deployment complete."
cat "$OUT_FILE"
