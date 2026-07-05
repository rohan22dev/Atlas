import Link from "next/link";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { CONTRACTS } from "@/lib/contracts/config";
import { ArrowRight } from "lucide-react";

const SECTIONS = [
  {
    title: "Overview",
    body: "Atlas is an overcollateralized lending protocol on Stellar Testnet. Users deposit XLM as collateral, borrow a test USDC stablecoin against it, repay at any time, and withdraw once healthy. Unhealthy vaults can be liquidated by anyone in exchange for a collateral bonus.",
  },
  {
    title: "Architecture",
    body: "Five Soroban contracts compose the protocol: a Vault (collateral custody + debt bookkeeping for every user), an Oracle (admin-pushed USD prices), a Treasury (USDC liquidity for borrows/repayments), a Liquidation contract (orchestrates atomic liquidations), and a Token contract (a SEP-41 test USDC with a permissionless faucet). The frontend is a Next.js app that talks directly to these contracts over Soroban RPC -- there is no backend server and no database in the request path.",
  },
  {
    title: "Protocol Parameters",
    body: "Max loan-to-value at origination: 60%. Liquidation threshold: 80%. Liquidation bonus: 5%. Borrow interest: 5% simple annual, accrued continuously and checkpointed on every borrow/repay.",
  },
  {
    title: "Security",
    body: "All arithmetic uses checked operations. Every state-changing call requires the caller's on-chain authorization. Borrowing beyond 60% LTV is rejected. Withdrawals that would drop a vault below the 80% liquidation threshold are rejected. Liquidations transfer collateral only after the liquidator's repayment lands in the Treasury, atomically, in the same transaction.",
  },
  {
    title: "Contracts on Testnet",
    body: null,
  },
];

export default function DocsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Navigation />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
        <p className="mt-3 text-muted-foreground">
          A quick reference for how Atlas works. For the full write-up, see README.md, ARCHITECTURE.md,
          SMART_CONTRACTS.md, and SECURITY.md in the project repository.
        </p>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>}
              {section.title === "Contracts on Testnet" && (
                <ul className="mt-3 space-y-1.5 font-mono text-xs text-muted-foreground">
                  {Object.entries(CONTRACTS).map(([name, id]) => (
                    <li key={name} className="flex justify-between gap-4 rounded-lg bg-secondary/30 px-3 py-2">
                      <span className="text-foreground">{name}</span>
                      <span>{id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <Link href="/dashboard" className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-atlas-blue hover:underline">
          Launch the app
          <ArrowRight className="size-4" />
        </Link>
      </main>
      <FooterSection />
    </div>
  );
}
