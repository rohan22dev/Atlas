"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AmountInput } from "./amount-input";
import { TxPreviewRow } from "./tx-preview-row";
import { HealthMeter } from "@/components/shared/health-meter";
import { useWallet } from "@/hooks/use-wallet";
import { usePositionView, useProtocolConfig } from "@/hooks/use-position";
import { useOraclePrice } from "@/hooks/use-oracle";
import { useWithdraw } from "@/hooks/use-vault-actions";
import { formatAmount, numberToFixed } from "@/lib/format";
import { HEALTH_FACTOR_ONE } from "@/lib/contracts/config";
import * as math from "@/lib/protocol-math";
import { ArrowUpFromLine } from "lucide-react";

export function WithdrawForm({ onSuccess }: { onSuccess?: () => void }) {
  const { address, isConnected, connect } = useWallet();
  const [amountStr, setAmountStr] = useState("");
  const { data: position } = usePositionView(address);
  const { data: config } = useProtocolConfig();
  const { data: xlmPrice } = useOraclePrice("XLM");
  const withdraw = useWithdraw();

  const amount = useMemo(() => numberToFixed(amountStr || "0"), [amountStr]);
  const exceedsCollateral = position && amount > position.collateral;

  const preview = useMemo(() => {
    if (!position || !config || xlmPrice === undefined) return null;
    const newCollateral = position.collateral - amount;
    const newCollateralValue = math.usdValue(newCollateral < 0n ? 0n : newCollateral, xlmPrice);
    const newHealth = math.healthFactor(newCollateralValue, position.debt_value_usd, config.liquidation_threshold_bps);
    return { newCollateral, newHealth };
  }, [position, config, xlmPrice, amount]);

  const wouldBeUnhealthy = preview && position && position.debt > 0n && preview.newHealth < HEALTH_FACTOR_ONE;
  const canSubmit = isConnected && amount > 0n && !exceedsCollateral && !wouldBeUnhealthy;

  return (
    <div className="space-y-5">
      <AmountInput
        value={amountStr}
        onChange={setAmountStr}
        symbol="XLM"
        balance={position?.collateral}
        balanceLabel="Deposited"
        onMax={() => position && setAmountStr(formatAmount(position.collateral, { maxFractionDigits: 7 }).replace(/,/g, ""))}
        autoFocus
      />

      {exceedsCollateral && <p className="text-xs text-atlas-red">Amount exceeds deposited collateral.</p>}
      {wouldBeUnhealthy && !exceedsCollateral && (
        <p className="text-xs text-atlas-red">
          This withdrawal would drop your health factor below 1.0 and is not allowed.
        </p>
      )}

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
          disabled={!canSubmit || withdraw.isPending}
          onClick={() =>
            withdraw.mutate(
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
          <ArrowUpFromLine className="size-4" />
          {withdraw.isPending ? "Withdrawing..." : "Withdraw XLM"}
        </Button>
      ) : (
        <Button className="w-full" size="lg" onClick={() => connect()}>
          Connect Wallet
        </Button>
      )}
    </div>
  );
}
