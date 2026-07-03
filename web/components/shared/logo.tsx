import Link from "next/link";
import { cn } from "@/lib/utils";

export function AtlasLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-7", className)} aria-hidden="true">
      <defs>
        <linearGradient id="atlas-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--atlas-blue)" />
          <stop offset="1" stopColor="var(--atlas-purple)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#atlas-logo-grad)" />
      <path
        d="M16 7L23 23H19.5L16 15L12.5 23H9L16 7Z"
        fill="white"
      />
    </svg>
  );
}

export function AtlasBrand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <AtlasLogo />
      <span className="text-lg">Atlas</span>
    </Link>
  );
}
