import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AtlasLogo } from "@/components/shared/logo";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="atlas-glow-bg flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <AtlasLogo className="size-14" />
      <div>
        <h1 className="atlas-gradient-text text-7xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-lg font-medium">This vault doesn&apos;t exist.</p>
        <p className="mt-1 text-sm text-muted-foreground">The page you&apos;re looking for has drifted off-chain.</p>
      </div>
      <div className="flex gap-3">
        <Button render={<Link href="/" />} className="gap-2">
          <Compass className="size-4" />
          Back to Home
        </Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
