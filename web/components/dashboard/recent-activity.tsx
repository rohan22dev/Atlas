"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentActivity } from "@/hooks/use-activity";
import { useWallet } from "@/hooks/use-wallet";
import { truncateAddress } from "@/lib/format";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  Banknote,
  Gavel,
  Activity as ActivityIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const EVENT_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  deposited: { label: "Deposit", icon: ArrowDownToLine, color: "text-atlas-blue" },
  withdrawn: { label: "Withdraw", icon: ArrowUpFromLine, color: "text-atlas-purple" },
  borrowed: { label: "Borrow", icon: HandCoins, color: "text-atlas-amber" },
  repaid: { label: "Repay", icon: Banknote, color: "text-atlas-green" },
  seized: { label: "Liquidated", icon: Gavel, color: "text-atlas-red" },
  liquidation_executed: { label: "Liquidation", icon: Gavel, color: "text-atlas-red" },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RecentActivity({ userAddress, title = "Recent Activity" }: { userAddress?: string | null; title?: string }) {
  const { address: connected } = useWallet();
  const { data: events, isLoading } = useRecentActivity(userAddress ?? connected);

  return (
    <Card className="atlas-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {events.map((event) => {
              const meta = EVENT_META[event.eventName] ?? {
                label: event.eventName,
                icon: ActivityIcon,
                color: "text-muted-foreground",
              };
              const Icon = meta.icon;
              const amount = (event.data.amount ?? event.data.debt_repaid ?? event.data.collateral_seized) as
                | bigint
                | undefined;
              return (
                <li key={event.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-8 items-center justify-center rounded-full bg-secondary ${meta.color}`}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{meta.label}</div>
                      <div className="text-xs text-muted-foreground">{timeAgo(event.closedAt)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {amount !== undefined && (
                      <div className="text-sm font-medium tabular-nums">
                        {(Number(amount) / 1e7).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </div>
                    )}
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted-foreground hover:text-atlas-blue hover:underline"
                    >
                      {truncateAddress(event.txHash, 5)}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
