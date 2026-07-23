import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Quote } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, caseStudySchema, faqSchema } from "@/lib/seo";
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

  // Related case studies — same-sector first, then fill to 3. Internal links
  // turn each proof page into a cluster instead of a dead end.
  const all = await getPublishedEntities<CaseStudy>("case_studies");
  const others = all.filter((c) => c.slug !== study.slug);
  const related = [
    ...others.filter((c) => c.sector === study.sector),
    ...others.filter((c) => c.sector !== study.sector),
  ].slice(0, 3);

  // Data-driven FAQ — every answer comes from the study's own fields, so it's
  // honest and citable. Feeds "how did {client} achieve {result}" answer boxes.
  const faqs = [
    {
      question: `What results did ${study.client} achieve?`,
      answer: `${study.heroMetric.value} ${study.heroMetric.label}. ${study.results
        .slice(0, 3)
        .map((r) => `${r.kpi}: ${r.before} → ${r.after} (${r.delta})`)
        .join("; ")}.`,
    },
    {
      question: `How long did the ${study.sector} project take?`,
      answer: `${ctx.timeline}. Budget: ${ctx.budget}.`,
    },
    {
      question: `Which services were used for ${study.client}?`,
      answer: ctx.services.join(", ") + ".",
    },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Case Studies", path: "/case-studies" },
          { name: study.client, path: `/case-studies/${study.slug}` },
        ])}
      />
      <JsonLd
        data={caseStudySchema({
          title: study.title,
          description:
            study.seo?.description ??
            `${study.client} · ${study.heroMetric.value} ${study.heroMetric.label}. ${study.problem.slice(0, 120)}`,
          path: `/case-studies/${study.slug}`,
          client: study.client,
        })}
      />
      <JsonLd data={faqSchema(faqs)} />

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

            {study.quote && (
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
            )}

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

          {/* Data-driven FAQ — answer-shaped, all from the study's own fields */}
          <div className="mt-14 border-t border-border pt-10">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Questions, answered
            </h2>
            <dl className="mt-6 flex flex-col">
              {faqs.map((f) => (
                <div key={f.question} className="border-b border-border py-5 first:pt-0 last:border-b-0">
                  <dt className="font-semibold tracking-tight">{f.question}</dt>
                  <dd className="mt-2 text-muted-foreground">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>

      {/* Related case studies — cluster the proof pages together */}
      {related.length > 0 && (
        <Section className="border-t border-border">
          <Container size="narrow">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              More case studies
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/case-studies/${r.slug}`}
                  className="group rounded-card border border-border p-5 transition-ui hover:border-foreground"
                >
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{r.sector}</div>
                  <div className="mt-2 font-semibold leading-snug tracking-tight">{r.title}</div>
                  <div className="mt-3 font-display text-2xl font-bold tracking-tight">{r.heroMetric.value}</div>
                  <div className="text-xs text-muted-foreground">{r.heroMetric.label}</div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      )}

      <CtaBand />
    </>
  );
}
