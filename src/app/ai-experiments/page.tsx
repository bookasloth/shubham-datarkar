import Link from "next/link";
import { ArrowRight, Bot, Search, Sparkles } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "AI Experiments",
  description: "The lab — AI experiments, documented results, and what's being built next.",
  path: "/ai-experiments",
});

const experiments = [
  {
    title: "Ask Shubham",
    status: "Building",
    description: "A chatbot trained on every article, case study, and framework — answering in my voice, with citations.",
    result: "RAG pipeline over published content. Private beta in Q3 2026.",
    icon: Bot,
  },
  {
    title: "Semantic site search",
    status: "Building",
    description: "Intent-based search that understands 'growing SaaS on a small budget' and surfaces the right five pieces.",
    result: "Vector index across all content. Early results: 3x better relevance than keyword search.",
    icon: Search,
  },
  {
    title: "AI content QA rubric",
    status: "Live",
    description: "An automated editorial rubric that pre-checks drafts against a quality bar before a human ever sees them.",
    result: "Cut editing time 40% while raising the average quality score.",
    icon: Sparkles,
  },
  {
    title: "30-day autonomous social test",
    status: "Done",
    description: "Let an AI agent run a social account for 30 days with guardrails, then measured what actually happened.",
    result: "Engagement held; voice drifted. Conclusion: AI accelerates, humans must steer.",
    icon: Sparkles,
  },
];

export default function AiExperimentsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "AI Experiments", path: "/ai-experiments" }])} />
      <PageHero
        eyebrow="The lab"
        title="AI experiments, in the open"
        description="AI is a multiplier, not a magic trick. Here's what I'm testing, what worked, and what didn't — with the receipts."
        crumbs={[{ label: "Home", href: "/" }, { label: "AI Experiments" }]}
      />
      <Section>
        <Container>
          <SectionHeading eyebrow="Experiments" title="What's running in the lab" />
          <Stagger className="mt-10 grid gap-4 md:grid-cols-2">
            {experiments.map((e) => {
              const ExpIcon = e.icon;
              return (
                <StaggerItem key={e.title}>
                  <Card className="flex h-full flex-col p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex size-11 items-center justify-center rounded-card bg-muted text-foreground">
                        <ExpIcon className="size-5" aria-hidden />
                      </div>
                      <Badge variant={e.status === "Live" ? "success" : e.status === "Done" ? "muted" : "warning"}>
                        {e.status}
                      </Badge>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight">{e.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{e.description}</p>
                    <p className="mt-4 border-t border-border pt-4 text-sm">
                      <span className="font-medium">Result: </span>
                      <span className="text-muted-foreground">{e.result}</span>
                    </p>
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>

          <div className="mt-12 rounded-card border border-border bg-card p-8 text-center">
            <h2 className="text-xl font-bold tracking-tight">Follow the experiments</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              I document the wins and the failures in the newsletter and in the free tools.
            </p>
            <Link href="/tools" className={cn(buttonVariants(), "mt-5")}>
              Try the live tools
              <ArrowRight />
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
