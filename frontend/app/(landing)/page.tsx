import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/Hero";
import { LandingHow } from "@/components/landing/How";
import { LandingVideoSlider } from "@/components/landing/VideoSlider";
import { LandingEarn } from "@/components/landing/Earn";
import { LandingStacks } from "@/components/landing/Stacks";
import { LandingCTA } from "@/components/landing/CTA";
import { LandingFooter } from "@/components/landing/Footer";
import { Ticker } from "@/components/landing/Ticker";
import { ScrollReveal } from "@/components/ScrollReveal";

export default function Home() {
  return (
    <>
      <LandingNav />
      <main>
        <LandingHero />
        <Ticker />
        <ScrollReveal>
          <LandingVideoSlider />
        </ScrollReveal>
        <ScrollReveal>
          <LandingHow />
        </ScrollReveal>
        <ScrollReveal>
          <LandingEarn />
        </ScrollReveal>
        <ScrollReveal>
          <LandingStacks />
        </ScrollReveal>
        <ScrollReveal>
          <LandingCTA />
        </ScrollReveal>
        <LandingFooter />
      </main>
    </>
  );
}
