import { PortfolioCard } from "@/components/dashboard/portfolio-card";
import { VaultCard } from "@/components/dashboard/vault-card";
import { FaucetCard } from "@/components/dashboard/faucet-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your Atlas portfolio at a glance.</p>
      </div>

      <PortfolioCard />
      <FaucetCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VaultCard />
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}
