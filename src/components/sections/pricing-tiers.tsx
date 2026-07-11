import { Card } from "@/components/ui/card";
import { Container, Section } from "@/components/layout/container";
import { Reveal } from "@/components/motion/reveal";
import { BrandIcon } from "@/components/ui/brand-icon";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const inr = (price: string) => `₹${Number(price).toLocaleString("en-IN")}`;

export function PricingTiers({
  tiers,
}: {
  tiers: { name: string; price: string; currency: "INR"; features: string[] }[];
}) {
  return (
    <Section id="pricing">
      <Container>
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Packages</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <Reveal key={t.name}>
              <Card className="flex h-full flex-col p-6">
                <h3 className="font-semibold">{t.name}</h3>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-extrabold tracking-tight">{inr(t.price)}</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={site.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
                >
                  <BrandIcon name="CalendarCheck" />
                  Book a call
                </a>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
