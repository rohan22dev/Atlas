"use client";

import { motion } from "framer-motion";
import { ArrowDownToLine, HandCoins, Banknote, ArrowUpFromLine } from "lucide-react";

const STEPS = [
  { number: "1", title: "Deposit", description: "Deposit XLM as collateral into your Atlas vault.", icon: ArrowDownToLine },
  { number: "2", title: "Borrow", description: "Borrow USDC against your collateral, up to 60% LTV.", icon: HandCoins },
  { number: "3", title: "Repay", description: "Repay your USDC debt plus interest whenever you like.", icon: Banknote },
  { number: "4", title: "Withdraw", description: "Withdraw your collateral once your vault is healthy.", icon: ArrowUpFromLine },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How Atlas works</h2>
          <p className="mt-4 text-muted-foreground">Four steps, entirely on-chain, from deposit to withdrawal.</p>
        </div>

        <div className="relative mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute top-14 left-0 hidden h-px w-full bg-gradient-to-r from-atlas-blue via-atlas-purple to-atlas-green lg:block" />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-lg font-bold shadow-lg">
                {step.number}
              </div>
              <div className="mt-4 flex items-center gap-2 font-semibold">
                <step.icon className="size-4 text-atlas-blue" />
                {step.title}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
