import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/lib/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlas — Deposit crypto. Borrow stablecoins.",
  description:
    "Atlas is an overcollateralized lending protocol on Stellar. Deposit crypto, borrow USDC, and keep your upside.",
  metadataBase: new URL("https://atlas-protocol.vercel.app"),
  openGraph: {
    title: "Atlas — Deposit crypto. Borrow stablecoins.",
    description: "An overcollateralized lending protocol on Stellar Testnet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="atlas-glow-bg min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
