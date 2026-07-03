"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AmountInput } from "./amount-input";
import { TxPreviewRow } from "./tx-preview-row";
import { HealthMeter } from "@/components/shared/health-meter";
import { useWallet } from "@/hooks/use-wallet";
import { useBalances } from "@/hooks/use-balances";
import { usePositionView, useProtocolConfig } from "@/hooks/use-position";
import { useOraclePrice } from "@/hooks/use-oracle";
import { useDeposit } from "@/hooks/use-vault-actions";
import { formatAmount, numberToFixed } from "@/lib/format";
import * as math from "@/lib/protocol-math";
import { ArrowDownToLine } from "lucide-react";

export function DepositForm({ onSuccess }: { onSuccess?: () => void }) {
  const { address, isConnected, connect } = useWallet();
  const [amountStr, setAmountStr] = useState("");
  const { data: balances } = useBalances();
  const { data: position } = usePositionView(address);
  const { data: config } = useProtocolConfig();
  const { data: xlmPrice } = useOraclePrice("XLM");
  const deposit = useDeposit();

  const amount = useMemo(() => numberToFixed(amountStr || "0"), [amountStr]);
  const insufficientBalance = balances && amount > balances.xlm;
  const canSubmit = isConnected && amount > 0n && !insufficientBalance;

  const preview = useMemo(() => {
    if (!position || !config || xlmPrice === undefined) return null;
    const newCollateral = position.collateral + amount;
    const newCollateralValue = math.usdValue(newCollateral, xlmPrice);
    const newHealth = math.healthFactor(newCollateralValue, position.debt_value_usd, config.liquidation_threshold_bps);
    return { newCollateral, newHealth };
  }, [position, config, xlmPrice, amount]);

  return (
    <div className="space-y-5">
      <AmountInput
        value={amountStr}
        onChange={setAmountStr}
        symbol="XLM"
        balance={balances?.xlm}
        onMax={() => balances && setAmountStr(formatAmount(balances.xlm, { maxFractionDigits: 7 }).replace(/,/g, ""))}
        autoFocus
      />

      {insufficientBalance && <p className="text-xs text-atlas-red">Insufficient XLM balance.</p>}

      {preview && amount > 0n && (
        <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
          <TxPreviewRow
            label="Collateral"
            before={`${formatAmount(position!.collateral)} XLM`}
            after={`${formatAmount(preview.newCollateral)} XLM`}
          />
          <HealthMeter healthFactor={preview.newHealth} />
        </div>
      )}

      {isConnected ? (
        <Button
          className="w-full gap-2 bg-gradient-to-r from-atlas-blue to-atlas-purple text-white hover:opacity-90"
          size="lg"
          disabled={!canSubmit || deposit.isPending}
          onClick={() =>
            deposit.mutate(
              { amount },
              {
                onSuccess: () => {
                  setAmountStr("");
                  onSuccess?.();
                },
              },
            )
          }
        >
          <ArrowDownToLine className="size-4" />
          {deposit.isPending ? "Depositing..." : "Deposit XLM"}
        </Button>
      ) : (
        <Button className="w-full" size="lg" onClick={() => connect()}>
          Connect Wallet
        </Button>
      )}
    </div>
  );
}
