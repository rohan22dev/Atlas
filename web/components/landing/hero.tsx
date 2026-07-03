"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { VaultIllustration } from "./vault-illustration";
import { ArrowRight, BookOpen } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-atlas-green" />
            Live on Stellar Testnet
          </div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Deposit crypto.
            <br />
            Borrow stablecoins.
            <br />
            <span className="atlas-gradient-text">Keep your upside.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Atlas is an overcollateralized lending protocol on Stellar. Deposit XLM, borrow USDC against it, and
            never lose exposure to your assets.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              render={<Link href="/dashboard" />}
              className="gap-2 bg-gradient-to-r from-atlas-blue to-atlas-purple text-white shadow-lg shadow-atlas-blue/20 hover:opacity-90"
            >
              Launch App
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/docs" />} className="gap-2">
              <BookOpen className="size-4" />
              Documentation
            </Button>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border/60 pt-6">
            <Stat label="Max LTV" value="60%" />
            <Stat label="Liquidation Bonus" value="5%" />
            <Stat label="Borrow APR" value="5%" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <VaultIllustration />
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
