import Link from "next/link";
import { CalendarCheck, Check } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Book a Call",
  description: "Pick a time and let's talk through your growth, product, or AI problem — and leave with a clear next step.",
  path: "/book",
});

const expect = [
  "A focused 30 minutes on your specific problem",
  "Straight answers — no pitch deck, no fluff",
  "At least one concrete, actionable next step",
  "Instant confirmation, calendar invite, and reminders",
];

export default function BookPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Book a Call", path: "/book" }])} />
      <PageHero
        eyebrow="Booking"
        title="Book a working session"
        description="No forms, no back-and-forth. Pick a slot that works and we'll get straight into it."
        crumbs={[{ label: "Home", href: "/" }, { label: "Book a Call" }]}
      />
      <Section>
        <Container size="narrow">
          <Card className="p-8 text-center md:p-12">
            <div className="mx-auto flex size-14 items-center justify-center rounded-card bg-foreground text-background">
              <CalendarCheck className="size-7" />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight">30-minute working session</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Scheduling opens in my calendar app. Pick a time, get an instant confirmation, and we&apos;re set.
            </p>
            <a
              href={site.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "mt-8")}
            >
              <BrandIcon name="CalendarCheck" />
              Open the calendar
            </a>

            <ul className="mx-auto mt-10 grid max-w-md gap-3 text-left">
              {expect.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="size-3" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Prefer to write first?{" "}
            <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">
              Send a brief instead
            </Link>
            .
          </p>
        </Container>
      </Section>
    </>
  );
}
