import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function AtlasLogo({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-full size-7 shrink-0", className)}>
      <Image src="/logo.jpg" alt="Atlas Logo" fill sizes="28px" className="object-cover" />
    </div>
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
