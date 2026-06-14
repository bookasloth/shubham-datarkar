import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarCheck, Check } from "lucide-react";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, faqSchema } from "@/lib/seo";
import { services, getService } from "@/lib/data/services";
import { faqs } from "@/lib/data/site-content";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return buildMetadata({ title: "Service", path: `/services/${slug}` });
  return buildMetadata({ title: service.name, description: service.outcome, path: `/services/${service.slug}` });
}

const serviceFaqs = faqs.filter((f) => f.group === "Working together" || f.group === "Pricing").slice(0, 5);

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: service.name, path: `/services/${service.slug}` },
          ]),
          faqSchema(serviceFaqs),
        ]}
      />
      <PageHero
        eyebrow="Service"
        title={service.name}
        description={service.outcome}
        crumbs={[{ label: "Home", href: "/" }, { label: "Services", href: "/services" }, { label: service.name }]}
        actions={
          <>
            <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }))}>
              <CalendarCheck />
              Book a call
            </a>
            <Link href="/contact" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Start a project
              <ArrowRight />
            </Link>
          </>
        }
      />

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
            <div className="flex flex-col gap-12">
              <Reveal>
                <div className="flex size-12 items-center justify-center rounded-card bg-muted text-foreground">
                  <Icon name={service.icon} className="size-6" />
                </div>
                <p className="mt-5 text-[17px] leading-8 text-foreground/90">{service.description}</p>
              </Reveal>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  What you get
                </h2>
                <Stagger className="mt-4 grid gap-3 sm:grid-cols-2">
                  {service.deliverables.map((d) => (
                    <StaggerItem key={d}>
                      <div className="flex items-start gap-3 rounded-card border border-border p-4 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span>{d}</span>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  The process
                </h2>
                <ol className="mt-4 flex flex-col gap-4">
                  {service.process.map((p, i) => (
                    <li key={p.step} className="flex gap-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-xs font-bold text-background">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold">{p.step}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">{p.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Common questions
                </h2>
                <Accordion type="single" collapsible className="mt-2">
                  {serviceFaqs.map((f) => (
                    <AccordionItem key={f.question} value={f.question}>
                      <AccordionTrigger>{f.question}</AccordionTrigger>
                      <AccordionContent>{f.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>

            {/* Sticky pricing aside */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Card className="p-6">
                <Badge variant="muted">{service.tagline}</Badge>
                <div className="mt-4">
                  <span className="text-xs text-muted-foreground">Starting at</span>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-display text-3xl font-extrabold tracking-tight">{service.startingAt}</span>
                    <span className="text-[10px] text-muted-foreground">+ ₹11.8 Booking Charges</span>
                  </div>
                </div>
                <a
                  href={site.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full hover:bg-[#fe5100] hover:text-black")}
                >
                  <CalendarCheck />
                  Book a call
                </a>
                <Link href="/contact" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-2 w-full hover:bg-[#fe5100] hover:text-black hover:border-[#fe5100]")}>
                  Send a brief
                </Link>
              </Card>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
