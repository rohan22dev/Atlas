"use client";

import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/use-wallet";
import { CONTRACTS, DEPLOYED, NETWORK_PASSPHRASE } from "@/lib/contracts/config";
import { truncateAddress } from "@/lib/format";
import { Copy, ExternalLink, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

const CONTRACT_ROWS: { label: string; id: string }[] = [
  { label: "Vault", id: CONTRACTS.vault },
  { label: "Oracle", id: CONTRACTS.oracle },
  { label: "Treasury", id: CONTRACTS.treasury },
  { label: "Liquidation", id: CONTRACTS.liquidation },
  { label: "USDC Token", id: CONTRACTS.usdcToken },
  { label: "XLM Token (native SAC)", id: CONTRACTS.xlmToken },
];

function copy(value: string) {
  navigator.clipboard.writeText(value);
  toast.success("Copied to clipboard");
}

export default function SettingsPage() {
  const { address, isConnected, disconnect } = useWallet();
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Wallet, network, and appearance preferences.</p>
      </div>

      <Card className="atlas-card">
        <CardHeader>
          <CardTitle className="text-base">Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-sm">{truncateAddress(address ?? "", 8)}</div>
                <div className="text-xs text-muted-foreground">Connected</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => address && copy(address)}>
                  <Copy className="size-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => disconnect()}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet connected.</p>
          )}
        </CardContent>
      </Card>

      <Card className="atlas-card">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            <Label htmlFor="theme-toggle">Dark mode</Label>
          </div>
          <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
        </CardContent>
      </Card>

      <Card className="atlas-card">
        <CardHeader>
          <CardTitle className="text-base">Network</CardTitle>
          <CardDescription>Atlas runs entirely on Stellar Testnet. No mainnet funds are ever at risk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Network</span>
            <span className="font-medium">{DEPLOYED.network}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Passphrase</span>
            <span className="font-mono text-xs">{NETWORK_PASSPHRASE}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">RPC</span>
            <span className="font-mono text-xs">{DEPLOYED.rpcUrl}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="atlas-card">
        <CardHeader>
          <CardTitle className="text-base">Deployed Contracts</CardTitle>
          <CardDescription>Every read and transaction goes directly to these contracts — no backend in between.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {CONTRACT_ROWS.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{truncateAddress(row.id, 6)}</span>
                <Button variant="ghost" size="icon" className="size-6" onClick={() => copy(row.id)}>
                  <Copy className="size-3" />
                </Button>
                <a
                  href={`https://stellar.expert/explorer/testnet/contract/${row.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-atlas-blue"
                >
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
