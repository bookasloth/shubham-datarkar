import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Quote } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import type { CaseStudy } from "@/lib/data/types";
import { getPublishedEntities, getPublishedEntityBySlug } from "@/lib/content/queries";
import { Container, Section } from "@/components/layout/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { CtaBand } from "@/components/sections/cta-band";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

// Prerender every published case study at build so first visit is CDN-instant.
export async function generateStaticParams() {
  const studies = await getPublishedEntities<CaseStudy>("case_studies");
  return studies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = await getPublishedEntityBySlug<CaseStudy>("case_studies", slug);
  if (!study) return buildMetadata({ title: "Case Study", path: `/case-studies/${slug}` });
  return buildMetadata({
    title: study.seo?.title ?? study.title,
    description:
      study.seo?.description ??
      `${study.client} · ${study.heroMetric.value} ${study.heroMetric.label}. ${study.problem.slice(0, 120)}`,
    ogTitle: study.seo?.ogTitle,
    ogDescription: study.seo?.ogDescription,
    path: `/case-studies/${study.slug}`,
    type: "article",
  });
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal className="border-t border-border pt-10">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </Reveal>
  );
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = await getPublishedEntityBySlug<CaseStudy>("case_studies", slug);
  if (!study) notFound();

  const ctx = study.context;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Case Studies", path: "/case-studies" },
          { name: study.client, path: `/case-studies/${study.slug}` },
        ])}
      />

      {/* Hero */}
      <Section bleed className="border-b border-border">
        <Container size="narrow" className="py-14 md:py-20">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Case Studies", href: "/case-studies" },
              { label: study.client },
            ]}
            className="mb-8"
          />
          <Badge variant="outline" className="mb-5">
            {study.sector}
          </Badge>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight md:text-4xl">{study.title}</h1>
          <div className="mt-10 flex flex-col gap-2 rounded-card border border-border bg-card p-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-display text-5xl font-extrabold tracking-tight">{study.heroMetric.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{study.heroMetric.label}</div>
            </div>
            <div className="text-sm text-muted-foreground">{study.client}</div>
          </div>

          {/* Context badge row */}
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-4">
            {[
              { k: "Industry", v: ctx.industry },
              { k: "Timeline", v: ctx.timeline },
              { k: "Budget", v: ctx.budget },
              { k: "Services", v: ctx.services.join(", ") },
            ].map((row) => (
              <div key={row.k} className="bg-card p-4">
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{row.k}</dt>
                <dd className="mt-1 text-sm font-medium">{row.v}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      {/* Body */}
      <Section>
        <Container size="narrow">
          <div className="flex flex-col gap-10">
            <Reveal>
              <p className="text-[17px] leading-8 text-foreground/90">{study.problem}</p>
            </Reveal>

            <Block title="The constraints">
              <ul className="flex flex-col gap-2">
                {study.constraints.map((c) => (
                  <li key={c} className="flex gap-3 text-[17px] leading-8 text-foreground/90">
                    <span className="mt-3 size-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title="The strategy">
              <p className="text-[17px] leading-8 text-foreground/90">{study.strategy}</p>
            </Block>

            <Block title="The execution">
              <ol className="flex flex-col gap-3">
                {study.execution.map((step, i) => (
                  <li key={step} className="flex gap-4 text-[17px] leading-8 text-foreground/90">
                    <span className="mt-1 font-display text-sm font-bold text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Block>

            <Block title="The results">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {study.results.map((r) => (
                    <TableRow key={r.kpi}>
                      <TableCell className="font-medium">{r.kpi}</TableCell>
                      <TableCell className="text-muted-foreground">{r.before}</TableCell>
                      <TableCell className="font-semibold">{r.after}</TableCell>
                      <TableCell>
                        <Badge variant="success">{r.delta}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Block>

            <Block title="Key learnings">
              <p className="text-[17px] leading-8 text-foreground/90">{study.learnings}</p>
            </Block>

            <Reveal className="border-t border-border pt-10">
              <Card className="bg-card p-8">
                <Quote className="size-6 text-muted-foreground" aria-hidden />
                <blockquote className="mt-4 font-display text-xl font-medium leading-snug tracking-tight">
                  {study.quote.text}
                </blockquote>
                <figcaption className="mt-4 text-sm text-muted-foreground">
                  — {study.quote.author}, {study.quote.role}
                </figcaption>
              </Card>
            </Reveal>

            <Reveal className="flex flex-col items-start gap-4 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-semibold">Want results like this?</p>
              <div className="flex gap-3">
                <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants())}>
                  <BrandIcon name="CalendarCheck" />
                  Book a call
                </a>
                <Link href="/case-studies" className={cn(buttonVariants({ variant: "outline" }))}>
                  More case studies
                  <ArrowRight />
                </Link>
              </div>
            </Reveal>
          </div>
        </Container>
      </Section>

      <CtaBand />
    </>
  );
}
