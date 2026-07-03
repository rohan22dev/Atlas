"use client";

import { LiquidationTable } from "@/components/liquidation/liquidation-table";
import { OracleAdminPanel } from "@/components/liquidation/oracle-admin-panel";
import { StatCard } from "@/components/shared/stat-card";
import { useAllVaults } from "@/hooks/use-liquidatable-vaults";
import { useWallet } from "@/hooks/use-wallet";
import { useProtocolConfig } from "@/hooks/use-position";
import { formatUsd } from "@/lib/format";
import { Gavel, ShieldAlert, Wallet2 } from "lucide-react";

export default function LiquidationsPage() {
  const { data: vaults } = useAllVaults();
  const { address } = useWallet();
  const { data: config } = useProtocolConfig();

  const liquidatable = (vaults ?? []).filter((v) => v.isLiquidatable);
  const totalBonus = liquidatable.reduce((acc, v) => acc + v.estimatedBonus, 0n);
  const isAdmin = Boolean(address && config && address === config.admin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Liquidation Market</h1>
        <p className="text-sm text-muted-foreground">
          Vaults below a 1.0 health factor can be liquidated for a 5% collateral bonus.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Liquidatable Vaults" value={liquidatable.length} icon={ShieldAlert} accent="red" />
        <StatCard label="Total Vaults" value={vaults?.length ?? 0} icon={Wallet2} accent="blue" />
        <StatCard label="Available Bonus" value={formatUsd(totalBonus)} icon={Gavel} accent="green" />
      </div>

      {isAdmin && <OracleAdminPanel />}

      <LiquidationTable />
    </div>
  );
}
