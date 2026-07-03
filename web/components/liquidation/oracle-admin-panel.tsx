"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useOraclePrice } from "@/hooks/use-oracle";
import { useUpdateOraclePrice } from "@/hooks/use-token-actions";
import { formatUsd, numberToFixed } from "@/lib/format";
import { Gauge } from "lucide-react";

/**
 * Admin-only price override for the MVP oracle. In production this would
 * be replaced by a decentralized feed (e.g. Reflector) -- see
 * contracts/oracle for the interface this would plug into unchanged.
 */
export function OracleAdminPanel() {
  const { data: xlmPrice } = useOraclePrice("XLM");
  const [xlmInput, setXlmInput] = useState("");
  const updatePrice = useUpdateOraclePrice();

  return (
    <Card className="atlas-card border-atlas-amber/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="size-4 text-atlas-amber" />
          Oracle Admin
        </CardTitle>
        <CardDescription>
          Update the XLM/USD price to simulate market moves and trigger liquidations. Admin-only.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="xlm-price">Current XLM Price: {xlmPrice !== undefined ? formatUsd(xlmPrice) : "…"}</Label>
          <Input
            id="xlm-price"
            placeholder="New price, e.g. 0.08"
            value={xlmInput}
            onChange={(e) => {
              if (/^\d*\.?\d*$/.test(e.target.value)) setXlmInput(e.target.value);
            }}
          />
        </div>
        <Button
          disabled={!xlmInput || updatePrice.isPending}
          onClick={() =>
            updatePrice.mutate(
              { asset: "XLM", price: numberToFixed(xlmInput) },
              { onSuccess: () => setXlmInput("") },
            )
          }
        >
          {updatePrice.isPending ? "Updating..." : "Update Price"}
        </Button>
      </CardContent>
    </Card>
  );
}
