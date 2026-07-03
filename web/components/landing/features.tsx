"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Coins, Code2, Lock } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Collateralized Loans",
    description: "Borrow USDC against your XLM without selling it. Your collateral stays yours until you choose to withdraw.",
    color: "text-atlas-blue",
    bg: "bg-atlas-blue/10",
  },
  {
    icon: Coins,
    title: "Low, Transparent Fees",
    description: "A flat 5% simple annual interest rate, calculated on-chain. No hidden fees, no surprises.",
    color: "text-atlas-green",
    bg: "bg-atlas-green/10",
  },
  {
    icon: Code2,
    title: "Open Source",
    description: "Every contract is written in Rust with Soroban, fully tested, and viewable end to end.",
    color: "text-atlas-purple",
    bg: "bg-atlas-purple/10",
  },
  {
    icon: Lock,
    title: "Secure Smart Contracts",
    description: "Overflow-checked arithmetic, strict authorization, and health-factor invariants enforced on every action.",
    color: "text-atlas-amber",
    bg: "bg-atlas-amber/10",
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for real DeFi lending</h2>
          <p className="mt-4 text-muted-foreground">
            Atlas takes the core mechanics of protocols like Aave and MakerDAO and implements them natively on
            Stellar.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="atlas-card p-6"
            >
              <div className={`inline-flex size-11 items-center justify-center rounded-xl ${feature.bg}`}>
                <feature.icon className={`size-5 ${feature.color}`} />
              </div>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
