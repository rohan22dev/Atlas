"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AtlasBrand } from "@/components/shared/logo";
import { ArrowRight, GitBranch } from "lucide-react";

export function CtaSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="atlas-card relative mx-auto max-w-4xl overflow-hidden p-10 text-center sm:p-16"
      >
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-atlas-blue/15 via-atlas-purple/10 to-transparent" />
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to try Atlas?</h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Connect a Stellar Testnet wallet and deposit, borrow, and repay in minutes.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            nativeButton={false} render={<Link href="/dashboard" />}
            className="gap-2 bg-gradient-to-r from-atlas-blue to-atlas-purple text-white shadow-lg shadow-atlas-blue/20 hover:opacity-90"
          >
            Launch App
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <AtlasBrand />
        <p className="text-xs text-muted-foreground">Atlas is an educational MVP running on Stellar Testnet. Not financial advice.</p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <GitBranch className="size-4" />
          Source
        </a>
      </div>
    </footer>
  );
}
