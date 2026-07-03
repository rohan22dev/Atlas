"use client";

import { motion } from "framer-motion";

const orbitingAssets = [
  { label: "XLM", angle: 0, radius: 150, color: "var(--atlas-blue)", duration: 18 },
  { label: "USDC", angle: 120, radius: 150, color: "var(--atlas-green)", duration: 22 },
  { label: "5%", angle: 240, radius: 150, color: "var(--atlas-purple)", duration: 26 },
];

export function VaultIllustration() {
  return (
    <div className="relative mx-auto flex h-[360px] w-full max-w-[420px] items-center justify-center sm:h-[420px]">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-atlas-blue/20 via-atlas-purple/10 to-transparent blur-3xl" />

      {/* Orbit rings */}
      <div className="absolute size-[300px] rounded-full border border-border/60 sm:size-[340px]" />
      <div className="absolute size-[220px] rounded-full border border-border/40 sm:size-[250px]" />

      {/* Central vault */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex size-32 items-center justify-center rounded-3xl border border-border/80 bg-card/90 shadow-2xl shadow-atlas-blue/20 backdrop-blur sm:size-36"
      >
        <motion.div
          animate={{ boxShadow: ["0 0 0px var(--atlas-blue)", "0 0 30px var(--atlas-blue)", "0 0 0px var(--atlas-blue)"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-atlas-blue to-atlas-purple sm:size-24"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-10 text-white sm:size-12">
            <path
              d="M12 2L3 6.5V11c0 4.9 3.4 9.4 9 10.9 5.6-1.5 9-6 9-10.9V6.5L12 2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Orbiting asset badges */}
      {orbitingAssets.map((asset) => (
        <motion.div
          key={asset.label}
          className="absolute"
          style={{ width: 0, height: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: asset.duration, repeat: Infinity, ease: "linear" }}
        >
          <div
            style={{ transform: `rotate(${asset.angle}deg) translate(${asset.radius}px) rotate(-${asset.angle}deg)` }}
            className="absolute"
          >
            <div
              style={{ borderColor: asset.color, color: asset.color }}
              className="flex size-14 items-center justify-center rounded-2xl border bg-card/90 text-xs font-semibold shadow-lg backdrop-blur"
            >
              {asset.label}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
