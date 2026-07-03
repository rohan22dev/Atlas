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
import { useRepay } from "@/hooks/use-vault-actions";
import { formatAmount, numberToFixed } from "@/lib/format";
import * as math from "@/lib/protocol-math";
import { Banknote } from "lucide-react";

export function RepayForm({ onSuccess }: { onSuccess?: () => void }) {
  const { address, isConnected, connect } = useWallet();
  const [amountStr, setAmountStr] = useState("");
  const { data: balances } = useBalances();
  const { data: position } = usePositionView(address);
  const { data: config } = useProtocolConfig();
  const { data: usdcPrice } = useOraclePrice("USDC");
  const repay = useRepay();

  const rawAmount = useMemo(() => numberToFixed(amountStr || "0"), [amountStr]);
  const amount = position && rawAmount > position.debt ? position.debt : rawAmount;
  const insufficientBalance = balances && amount > balances.usdc;

  const preview = useMemo(() => {
    if (!position || !config || usdcPrice === undefined) return null;
    const newDebt = position.debt - amount;
    const newDebtValue = math.usdValue(newDebt, usdcPrice);
    const newHealth = math.healthFactor(position.collateral_value_usd, newDebtValue, config.liquidation_threshold_bps);
    return { newDebt, newHealth };
  }, [position, config, usdcPrice, amount]);

  const canSubmit = isConnected && amount > 0n && !insufficientBalance && position && position.debt > 0n;

  return (
    <div className="space-y-5">
      {position?.debt === 0n && (
        <p className="rounded-lg border border-atlas-green/30 bg-atlas-green/10 p-3 text-xs text-atlas-green">
          You have no outstanding debt.
        </p>
      )}

      <AmountInput
        value={amountStr}
        onChange={setAmountStr}
        symbol="USDC"
        balance={balances?.usdc}
        onMax={() => {
          if (!position || !balances) return;
          const max = position.debt < balances.usdc ? position.debt : balances.usdc;
          setAmountStr(formatAmount(max, { maxFractionDigits: 7 }).replace(/,/g, ""));
        }}
        autoFocus
      />

      {insufficientBalance && <p className="text-xs text-atlas-red">Insufficient USDC balance.</p>}

      {preview && amount > 0n && (
        <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-4">
          <TxPreviewRow
            label="Outstanding Debt"
            before={`${formatAmount(position!.debt)} USDC`}
            after={`${formatAmount(preview.newDebt)} USDC`}
          />
          <HealthMeter healthFactor={preview.newHealth} />
        </div>
      )}

      {isConnected ? (
        <Button
          className="w-full gap-2 bg-gradient-to-r from-atlas-blue to-atlas-purple text-white hover:opacity-90"
          size="lg"
          disabled={!canSubmit || repay.isPending}
          onClick={() =>
            repay.mutate(
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
          <Banknote className="size-4" />
          {repay.isPending ? "Repaying..." : "Repay USDC"}
        </Button>
      ) : (
        <Button className="w-full" size="lg" onClick={() => connect()}>
          Connect Wallet
        </Button>
      )}
    </div>
  );
}
