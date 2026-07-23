import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Gamepad2,
  Gift,
  LayoutDashboard,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { buildMetadata, breadcrumbSchema, faqSchema } from "@/lib/seo";
import { membership as m, type MembershipIcon } from "@/lib/data/landing/membership";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { CtaBand } from "@/components/sections/cta-band";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: m.metaTitle,
  description: m.metaDescription,
  path: m.path,
});

// All join CTAs route here — opens the signup view directly (see /login).
// After signup a member lands in /members (their workspace), where the
// membership actually lives. ponytail: checkout (Razorpay) not wired yet —
// this creates the account; charging is the next step.
const SIGNUP = "/register";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const ICONS: Record<MembershipIcon, LucideIcon> = {
  community: Users,
  tools: Wrench,
  games: Gamepad2,
  goodies: Gift,
  os: LayoutDashboard,
  content: BookOpen,
};

// Annual saving vs paying monthly across the year — computed, never hardcoded.
const monthly = m.plans.find((p) => p.cadence === "month");
const annual = m.plans.find((p) => p.cadence === "year");
const annualSaving =
  monthly && annual ? monthly.price * 12 - annual.price : 0;

export default function MembershipPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Membership", path: m.path },
          ]),
          faqSchema(m.faqs),
        ]}
      />
      <PageHero
        blueprint
        eyebrow="Membership"
        title={m.h1}
        description={m.subhead}
        crumbs={[{ label: "Home", href: "/" }, { label: "Membership" }]}
        actions={
          <>
            <Link href={SIGNUP} className={cn(buttonVariants({ size: "lg" }))}>
              Join now
              <ArrowRight />
            </Link>
            <Link href="#pricing" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              See pricing
            </Link>
          </>
        }
      />

      {/* Benefits — the core "what you get" grid */}
      <Section>
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            What&rsquo;s inside
          </h2>
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {m.benefits.map((b) => {
              const Icon = ICONS[b.icon];
              return (
                <StaggerItem key={b.title} className={cn(b.wide && "sm:col-span-2")}>
                  <Card className="flex h-full flex-col p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex size-10 items-center justify-center rounded-btn bg-foreground text-background">
                        <Icon className="size-5" />
                      </span>
                      {b.status === "soon" && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Coming soon
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-4 font-semibold">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.blurb}</p>
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>

          <div className="mt-8">
            <Link href={SIGNUP} className={cn(buttonVariants({ size: "lg" }))}>
              Get all of this
              <ArrowRight />
            </Link>
          </div>
        </Container>
      </Section>

      {/* Pricing */}
      <Section id="pricing" className="pt-0">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Simple pricing
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:max-w-3xl">
            {m.plans.map((p) => (
              <Reveal key={p.name}>
                <Card
                  className={cn(
                    "flex h-full flex-col p-6",
                    p.highlight && "border-foreground ring-1 ring-foreground",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.badge && <Badge>{p.badge}</Badge>}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-extrabold tracking-tight">{inr(p.price)}</span>
                    <span className="text-sm text-muted-foreground">/ {p.cadence}</span>
                  </div>
                  {p.cadence === "year" && annualSaving > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Save {inr(annualSaving)} vs monthly
                    </p>
                  )}
                  <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={SIGNUP}
                    className={cn(
                      buttonVariants({ size: "lg", variant: p.highlight ? "default" : "outline" }),
                      "mt-6 w-full",
                    )}
                  >
                    Get {p.name.toLowerCase()}
                    <ArrowRight />
                  </Link>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* How it works — sets honest expectations (account first, then join) */}
      <Section className="pt-0">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            How it works
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {m.steps.map((s, i) => (
              <li key={s.step} className="flex flex-col gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-xs font-bold text-background">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{s.step}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* FAQ */}
      <Section className="pt-0">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">FAQ</h2>
          <Accordion type="single" collapsible className="mt-2">
            {m.faqs.map((f) => (
              <AccordionItem key={f.question} value={f.question}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </Section>

      <CtaBand
        title="Ready to join?"
        description="Create your account and everything above unlocks — from ₹99 a month, or ₹999 for the year."
        primaryLabel="Create your account"
        primaryHref={SIGNUP}
        primaryIcon={null}
        secondaryLabel="Talk to me first"
        secondaryHref="/contact"
      />
    </>
  );
}
