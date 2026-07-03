"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What network does Atlas run on?",
    a: "Atlas runs entirely on Stellar Testnet. All contracts, tokens, and transactions use test assets with no real-world value, so you can try every feature risk-free.",
  },
  {
    q: "What can I use as collateral?",
    a: "XLM today. USDC is also supported as collateral by the protocol's asset list, and BTC/ETH are planned for a future release once wrapped assets are available on Stellar.",
  },
  {
    q: "How is interest calculated?",
    a: "Atlas charges a flat 5% simple annual interest rate on outstanding debt, accrued continuously and checkpointed on every borrow or repay.",
  },
  {
    q: "What happens if my vault becomes unhealthy?",
    a: "If your health factor drops below 1.0 (collateral value × 80% liquidation threshold, divided by debt value), anyone can liquidate your vault: they repay your debt and receive your collateral plus a 5% bonus.",
  },
  {
    q: "Where do prices come from?",
    a: "An on-chain Oracle contract stores USD prices for each asset. For this MVP, the admin account updates prices directly; the interface is designed to swap in a decentralized feed like Reflector without any other contract changes.",
  },
  {
    q: "Is there a backend?",
    a: "No. The frontend reads directly from the deployed Soroban contracts via RPC, and every write goes through your connected wallet. There is no server holding funds or making decisions on your behalf.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
        </div>

        <Accordion className="mt-10">
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`} className="atlas-card mb-3 px-4">
              <AccordionTrigger className="text-left text-sm font-medium">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
