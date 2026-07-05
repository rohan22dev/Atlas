import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Vault, Gavel, BarChart3, Settings } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const APP_NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vault", label: "My Vault", icon: Vault },
  { href: "/liquidations", label: "Liquidations", icon: Gavel },
  { href: "/stats", label: "Protocol Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/wallet", label: "Wallet", icon: Vault },
];
