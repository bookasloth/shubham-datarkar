import Link from "next/link";
import { CalendarCheck, Check } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, faqSchema } from "@/lib/seo";
import { personRef } from "@/lib/seo/entities";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Book a Free Working Session",
  description:
    "Book a free 30-minute working session on your growth, product, or AI problem. No forms, no pitch — just straight answers and one concrete next step.",
  ogTitle: "Book a free working session",
  ogDescription:
    "30 free, focused minutes on your growth, product, or AI problem. No pitch deck, no fluff — you leave with a concrete next step.",
  path: "/book",
});

const expect = [
  "A focused 30 minutes on your specific problem",
  "Straight answers — no pitch deck, no fluff",
  "At least one concrete, actionable next step",
  "Instant confirmation, calendar invite, and reminders",
];

// Answer-shaped content for AEO + FAQ rich results. Kept in sync with faqSchema.
const faqs = [
  {
    question: "Is the working session free?",
    answer:
      "Yes. The 30-minute working session is completely free. There's no charge, no card required, and no obligation to work together afterward.",
  },
  {
    question: "How long is the call and what happens on it?",
    answer:
      "It's 30 focused minutes on your specific growth, product, or AI problem. No pitch deck and no fluff — we get straight into your situation and you leave with at least one concrete, actionable next step.",
  },
  {
    question: "Who is the session for?",
    answer:
      "Founders and teams at 0–10 Cr companies working on SEO, AEO/GEO, performance marketing, content, or AI workflows — anyone who wants a straight second opinion from someone who has shipped the work hands-on.",
  },
  {
    question: "How do I book a time?",
    answer:
      "Pick a slot in the calendar on this page. You'll get instant confirmation, a calendar invite, and reminders — no back-and-forth emails to schedule it.",
  },
  {
    question: "What if I'd rather write first?",
    answer:
      "You can send a brief instead of booking a call. Head to the contact page, describe your situation, and you'll get a reply with a next step.",
  },
];

// A free consultation, modeled honestly: Service provided by the Person, with a
// zero-price Offer so answer engines can state "free" with a source.
function bookingServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Consultation",
    name: "Free 30-minute working session",
    description:
      "A free 30-minute working session on your growth, product, or AI problem — straight answers and one concrete next step.",
    provider: personRef,
    areaServed: "Worldwide",
    url: `${site.url}/book`,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${site.url}/book`,
      description: "Free 30-minute consultation",
    },
  };
}

export default function BookPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Book a Call", path: "/book" }])} />
      <JsonLd data={bookingServiceSchema()} />
      <JsonLd data={faqSchema(faqs)} />
      <PageHero
        eyebrow="Booking"
        title="Book a free working session"
        description="A free, focused 30 minutes on your problem. No forms, no back-and-forth — pick a slot and we'll get straight into it."
        crumbs={[{ label: "Home", href: "/" }, { label: "Book a Call" }]}
      />
      <Section>
        <Container size="narrow">
          <Card className="p-8 text-center md:p-12">
            <div className="mx-auto flex size-14 items-center justify-center rounded-card bg-foreground text-background">
              <CalendarCheck className="size-7" />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight">Free 30-minute working session</h2>
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

      <Section className="border-t border-border">
        <Container size="narrow">
          <h2 className="text-2xl font-bold tracking-tight">Questions about the session</h2>
          <dl className="mt-8 flex flex-col">
            {faqs.map((f) => (
              <div key={f.question} className="border-b border-border py-6 first:pt-0 last:border-b-0">
                <dt className="text-lg font-semibold tracking-tight">{f.question}</dt>
                <dd className="mt-2 text-[17px] leading-8 text-muted-foreground">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>
    </>
  );
}
