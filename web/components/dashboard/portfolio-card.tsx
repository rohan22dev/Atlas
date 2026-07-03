"use client";

import { motion } from "framer-motion";
import { StatCard } from "@/components/shared/stat-card";
import { usePositionView, useProtocolConfig } from "@/hooks/use-position";
import { useWallet } from "@/hooks/use-wallet";
import { formatHealthFactor, formatUsd } from "@/lib/format";
import * as math from "@/lib/protocol-math";
import { Layers, TrendingDown, Zap, HeartPulse, Wallet } from "lucide-react";

export function PortfolioCard() {
  const { address } = useWallet();
  const { data: position, isLoading } = usePositionView(address);
  const { data: config } = useProtocolConfig();

  const netValueUsd = position ? position.collateral_value_usd - position.debt_value_usd : 0n;
  const borrowPowerUsd =
    position && config ? math.maxBorrowUsd(position.collateral_value_usd, config.ltv_bps) - position.debt_value_usd : 0n;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      <StatCard
        label="Total Collateral"
        value={position ? formatUsd(position.collateral_value_usd) : "$0.00"}
        icon={Layers}
        accent="blue"
        isLoading={isLoading}
      />
      <StatCard
        label="Total Borrowed"
        value={position ? formatUsd(position.debt_value_usd) : "$0.00"}
        icon={TrendingDown}
        accent="purple"
        isLoading={isLoading}
      />
      <StatCard
        label="Borrow Power"
        value={formatUsd(borrowPowerUsd > 0n ? borrowPowerUsd : 0n)}
        icon={Zap}
        accent="amber"
        isLoading={isLoading}
      />
      <StatCard
        label="Health Factor"
        value={position ? formatHealthFactor(position.health_factor) : "∞"}
        icon={HeartPulse}
        accent="green"
        isLoading={isLoading}
      />
      <StatCard
        label="Net Value"
        value={formatUsd(netValueUsd)}
        icon={Wallet}
        accent="none"
        isLoading={isLoading}
        className="col-span-2 sm:col-span-1"
      />
    </motion.div>
  );
}
