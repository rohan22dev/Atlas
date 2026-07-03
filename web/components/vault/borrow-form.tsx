"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BorrowSlider } from "./borrow-slider";
import { RiskMeter } from "@/components/shared/risk-meter";
import { TxPreviewRow } from "./tx-preview-row";
import { HealthMeter } from "@/components/shared/health-meter";
import { useWallet } from "@/hooks/use-wallet";
import { usePositionView, useProtocolConfig } from "@/hooks/use-position";
import { useOraclePrice } from "@/hooks/use-oracle";
import { useBorrow } from "@/hooks/use-vault-actions";
import { formatAmount, formatUsd } from "@/lib/format";
import * as math from "@/lib/protocol-math";
import { HandCoins } from "lucide-react";

export function BorrowForm({ onSuccess }: { onSuccess?: () => void }) {
  const { address, isConnected, connect } = useWallet();
  const [amount, setAmount] = useState(0n);
  const { data: position } = usePositionView(address);
  const { data: config } = useProtocolConfig();
  const { data: xlmPrice } = useOraclePrice("XLM");
  const { data: usdcPrice } = useOraclePrice("USDC");
  const borrow = useBorrow();

  const maxBorrow = useMemo(() => {
    if (!position || !config) return 0n;
    const maxDebtUsd = math.maxBorrowUsd(position.collateral_value_usd, config.ltv_bps);
    const headroomUsd = maxDebtUsd - position.debt_value_usd;
    if (headroomUsd <= 0n || !usdcPrice) return 0n;
    return (headroomUsd * 10_000_000n) / usdcPrice;
  }, [position, config, usdcPrice]);

  const preview = useMemo(() => {
    if (!position || !config || xlmPrice === undefined || usdcPrice === undefined) return null;
    const newDebt = position.debt + amount;
    const newDebtValue = math.usdValue(newDebt, usdcPrice);
    const newHealth = math.healthFactor(position.collateral_value_usd, newDebtValue, config.liquidation_threshold_bps);
    const newLtvBps = math.ltvBpsOf(position.collateral_value_usd, newDebtValue);
    const liqPrice = math.liquidationPrice(position.collateral, newDebtValue, config.liquidation_threshold_bps);
    return { newDebt, newHealth, newLtvBps, liqPrice };
  }, [position, config, xlmPrice, usdcPrice, amount]);

  const hasCollateral = position && position.collateral > 0n;
  const canSubmit = isConnected && hasCollateral && amount > 0n && amount <= maxBorrow;

  return (
    <div className="space-y-5">
      {!hasCollateral && isConnected && (
        <p className="rounded-lg border border-atlas-amber/30 bg-atlas-amber/10 p-3 text-xs text-atlas-amber">
          Deposit collateral first before borrowing.
        </p>
      )}

      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <div className="text-3xl font-semibold tabular-nums">{formatAmount(amount)} <span className="text-lg text-muted-foreground">USDC</span></div>
        <div className="mt-4">
          <BorrowSlider amount={amount} max={maxBorrow} onChange={setAmount} />
        </div>
      </div>

      {preview && (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-2">
          <RiskMeter ltvBps={Number(preview.newLtvBps)} />
          <div className="space-y-3 self-center">
            <TxPreviewRow
              label="Borrow Power Used"
              before={`${formatAmount(position!.debt)} USDC`}
              after={`${formatAmount(preview.newDebt)} USDC`}
            />
            <TxPreviewRow label="Liquidation Price (XLM)" before="—" after={formatUsd(preview.liqPrice)} />
            <HealthMeter healthFactor={preview.newHealth} />
          </div>
        </div>
      )}

      {isConnected ? (
        <Button
          className="w-full gap-2 bg-gradient-to-r from-atlas-blue to-atlas-purple text-white hover:opacity-90"
          size="lg"
          disabled={!canSubmit || borrow.isPending}
          onClick={() =>
            borrow.mutate(
              { amount },
              {
                onSuccess: () => {
                  setAmount(0n);
                  onSuccess?.();
                },
              },
            )
          }
        >
          <HandCoins className="size-4" />
          {borrow.isPending ? "Borrowing..." : "Borrow USDC"}
        </Button>
      ) : (
        <Button className="w-full" size="lg" onClick={() => connect()}>
          Connect Wallet
        </Button>
      )}
    </div>
  );
}
