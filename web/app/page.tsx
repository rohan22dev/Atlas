import { LandingNavbar } from "@/components/landing/landing-navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Security } from "@/components/landing/security";
import { FAQ } from "@/components/landing/faq";
import { CtaSection, Footer } from "@/components/landing/cta-footer";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <LandingNavbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Security />
      <FAQ />
      <CtaSection />
      <Footer />
    </div>
  );
}
