"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const GUARANTEES = [
  "Checked arithmetic everywhere -- overflow, underflow, and negative balances are rejected, not silently wrapped",
  "Every state-changing call requires the caller's on-chain authorization (require_auth), preventing unauthorized access",
  "Borrowing is capped at 60% of collateral value; the contract rejects any borrow that would exceed it",
  "Withdrawals are blocked if they would drop a vault below the 80% liquidation threshold",
  "Liquidations are atomic: the liquidator's repayment and the collateral transfer happen in the same transaction, or neither happens",
  "Cross-contract calls (Vault ↔ Treasury ↔ Liquidation) are authorized structurally, not by caller-supplied addresses",
];

export function Security() {
  return (
    <section id="security" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Security first</h2>
          <p className="mt-4 text-muted-foreground">
            Every guarantee below is enforced directly in the Soroban contracts and covered by unit and integration
            tests.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GUARANTEES.map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="atlas-card flex items-start gap-3 p-4"
            >
              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-atlas-green/15">
                <Check className="size-3 text-atlas-green" />
              </div>
              <p className="text-sm text-muted-foreground">{item}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
