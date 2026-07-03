"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AtlasBrand } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { APP_NAV_LINKS } from "@/lib/nav";
import { ExternalLink } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/60 backdrop-blur-md lg:flex">
      <div className="flex h-16 items-center px-6">
        <AtlasBrand />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {APP_NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                active && "bg-secondary text-foreground shadow-sm",
              )}
            >
              <Icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-4">
        <a
          href="https://stellar.org/developers"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
          Stellar Developer Docs
        </a>
        <div className="mt-2 px-3 text-[11px] text-muted-foreground/70">Atlas is running on Stellar Testnet.</div>
      </div>
    </aside>
  );
}
