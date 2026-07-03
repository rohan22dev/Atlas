"use client";

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LiquidationBadge } from "@/components/shared/liquidation-badge";
import { useAllVaults } from "@/hooks/use-liquidatable-vaults";
import { useLiquidate } from "@/hooks/use-liquidation-actions";
import { useWallet } from "@/hooks/use-wallet";
import { formatAmount, formatHealthFactor, formatUsd, truncateAddress } from "@/lib/format";
import { Gavel } from "lucide-react";
import { toast } from "sonner";

export function LiquidationTable() {
  const { address, isConnected, connect } = useWallet();
  const { data: vaults, isLoading } = useAllVaults();
  const liquidate = useLiquidate();

  const sorted = [...(vaults ?? [])].sort((a, b) => {
    if (a.isLiquidatable !== b.isLiquidatable) return a.isLiquidatable ? -1 : 1;
    return Number(a.healthFactor - b.healthFactor);
  });

  return (
    <div className="atlas-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vault Owner</TableHead>
            <TableHead>Collateral</TableHead>
            <TableHead>Debt</TableHead>
            <TableHead>Health Factor</TableHead>
            <TableHead>Est. Bonus</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                No vaults with outstanding debt yet.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((vault) => (
              <TableRow key={vault.owner}>
                <TableCell className="font-mono text-xs">{truncateAddress(vault.owner, 6)}</TableCell>
                <TableCell className="tabular-nums">{formatAmount(vault.collateral)} XLM</TableCell>
                <TableCell className="tabular-nums">{formatAmount(vault.debt)} USDC</TableCell>
                <TableCell className="tabular-nums">{formatHealthFactor(vault.healthFactor)}</TableCell>
                <TableCell className="tabular-nums">{formatUsd(vault.estimatedBonus)}</TableCell>
                <TableCell>
                  <LiquidationBadge healthFactor={vault.healthFactor} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={vault.isLiquidatable ? "default" : "outline"}
                    disabled={!vault.isLiquidatable || vault.owner === address || liquidate.isPending}
                    className={vault.isLiquidatable ? "gap-1.5 bg-atlas-red text-white hover:bg-atlas-red/90" : "gap-1.5"}
                    onClick={() => {
                      if (!isConnected) {
                        connect().catch(() => undefined);
                        return;
                      }
                      if (vault.owner === address) {
                        toast.error("You can't liquidate your own vault");
                        return;
                      }
                      liquidate.mutate({ owner: vault.owner });
                    }}
                  >
                    <Gavel className="size-3.5" />
                    Liquidate
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
