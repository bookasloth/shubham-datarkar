import * as React from "react";
import type { ContentBlock, ListItem, RichText as RichTextValue } from "@/lib/data/types";
import { slugify } from "@/lib/utils";

import { RichText } from "@/components/content/rich-text";
import { AffiliateProvider } from "@/components/content/affiliate-context";
import { AudioPlayer } from "@/components/content/audio-player";
import { Figure, Gallery, MapEmbed, SideBySide, SocialEmbed, VideoEmbed } from "@/components/content/editorial-media";
import {
  AuthorNote,
  ButtonGroup,
  Callout,
  ComparisonCards,
  ComparisonTable,
  CtaBanner,
  DownloadCard,
  ExpertInsight,
  Footnotes,
  KeyTakeaways,
  MetricsGrid,
  ProgressBlock,
  ProsCons,
  PullQuote,
  QuickFacts,
  References,
  ResourceList,
  Spacer,
  StatCards,
  StepGuide,
  SummaryBox,
  TableBlock,
  Tags,
} from "@/components/content/editorial-blocks";

import { CodeBlock } from "@/components/ui/code-block";
import { Separator } from "@/components/ui/separator";
import { Timeline } from "@/components/ui/timeline";
import { Check } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PricingTable, type Plan } from "@/components/ui/pricing-table";
import { NewsletterForm } from "@/components/sections/newsletter-form";
import { PostCard } from "@/components/cards/post-card";
import { getPost } from "@/lib/data/posts";
import { ChevronDown } from "lucide-react";

const pricingPlans: Plan[] = [
  {
    name: "Audit",
    monthly: 45000,
    annual: 38000,
    blurb: "One-time technical + content audit.",
    features: ["Full crawl & architecture review", "Keyword + intent map", "90-day action plan"],
  },
  {
    name: "Build",
    monthly: 150000,
    annual: 125000,
    blurb: "We design and ship the system.",
    features: ["Everything in Audit", "Pillar + cluster build", "Internal-link engine", "Monthly reporting"],
    featured: true,
    cta: "Start building",
  },
  {
    name: "Compound",
    monthly: 90000,
    annual: 75000,
    blurb: "Ongoing growth retainer.",
    features: ["Refresh & expansion cadence", "Quarterly strategy", "Priority support"],
  },
];

/* ---- nested-aware list rendering ---- */
function isNested(item: ListItem): item is { text: RichTextValue; items: RichTextValue[] } {
  return typeof item === "object" && !Array.isArray(item) && item !== null && "items" in item;
}

function UnorderedList({ items }: { items: ListItem[] }) {
  return (
    <ul className="ml-1 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-[17px] leading-8 text-foreground/90">
          <div className="flex gap-3">
            <span className="mt-3 size-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden />
            <span>
              <RichText value={isNested(item) ? item.text : item} />
            </span>
          </div>
          {isNested(item) && (
            <ul className="ml-7 mt-2 space-y-1.5">
              {item.items.map((sub, j) => (
                <li key={j} className="flex gap-3 text-[15px] leading-7 text-muted-foreground">
                  <span className="mt-2.5 h-px w-3 shrink-0 bg-foreground/30" aria-hidden />
                  <span>
                    <RichText value={sub} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function OrderedList({ items }: { items: ListItem[] }) {
  return (
    <ol className="ml-1 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[17px] leading-8 text-foreground/90">
          <span className="mt-1 font-display text-sm font-bold text-muted-foreground">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>
            <RichText value={isNested(item) ? item.text : item} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    /* — Typography — */
    case "h2":
      return (
        <h2 id={slugify(block.text)} className="scroll-mt-28 pt-4 text-2xl font-bold tracking-tight">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 id={slugify(block.text)} className="scroll-mt-28 text-xl font-semibold tracking-tight">
          {block.text}
        </h3>
      );
    case "h4":
      return <h4 className="scroll-mt-28 text-lg font-semibold tracking-tight">{block.text}</h4>;
    case "lead":
      return (
        <p className="text-pretty text-xl leading-9 text-foreground md:text-[22px] md:leading-10">
          <RichText value={block.text} />
        </p>
      );
    case "p":
      return (
        <p className="text-[17px] leading-8 text-foreground/90">
          <RichText value={block.text} />
        </p>
      );
    case "small":
      return (
        <p className="text-sm leading-6 text-muted-foreground">
          <RichText value={block.text} />
        </p>
      );
    case "caption":
      return (
        <p className="text-center text-xs uppercase tracking-wider text-muted-foreground">
          <RichText value={block.text} />
        </p>
      );

    /* — Lists — */
    case "ul":
      return <UnorderedList items={block.items} />;
    case "ol":
      return <OrderedList items={block.items} />;
    case "tasklist":
      return (
        <ul className="ml-1 space-y-2.5" role="list">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[17px] leading-7">
              <span
                className={
                  "mt-1 flex size-5 shrink-0 items-center justify-center rounded border " +
                  (item.done ? "border-foreground bg-foreground text-background" : "border-border")
                }
                aria-hidden
              >
                {item.done && <Check className="size-3.5" />}
              </span>
              <span className={item.done ? "text-muted-foreground line-through" : "text-foreground/90"}>
                <RichText value={item.text} />
              </span>
            </li>
          ))}
        </ul>
      );

    /* — Media — */
    case "figure":
      return <Figure image={block.image} featured={block.featured} />;
    case "figures":
      return <SideBySide images={block.images} />;
    case "gallery":
      return <Gallery images={block.images} />;
    case "video":
      return <VideoEmbed id={block.id} title={block.title} caption={block.caption} />;
    case "audio":
      return <AudioPlayer title={block.title} subtitle={block.subtitle} duration={block.duration} />;

    /* — Quotes — */
    case "quote":
      return (
        <blockquote className="border-l-2 border-foreground pl-5">
          <p className="font-display text-xl font-medium leading-snug tracking-tight">
            <RichText value={block.text} />
          </p>
          {block.cite && <cite className="mt-2 block text-sm not-italic text-muted-foreground">— {block.cite}</cite>}
        </blockquote>
      );
    case "pullquote":
      return <PullQuote text={block.text} cite={block.cite} />;

    /* — Code — */
    case "code":
      return <CodeBlock code={block.code} lang={block.lang} filename={block.filename} />;

    /* — Tables — */
    case "table":
      return <TableBlock columns={block.columns} rows={block.rows} caption={block.caption} />;
    case "comparisonTable":
      return <ComparisonTable columns={block.columns} rows={block.rows} />;
    case "pricing":
      return <PricingTable plans={pricingPlans} className="not-prose" />;

    /* — Callouts — */
    case "callout":
      return <Callout variant={block.variant} title={block.title} text={block.text} />;

    /* — Interactive — */
    case "faq":
      return (
        <Accordion type="single" collapsible className="not-prose w-full rounded-card border border-border px-5">
          {block.items.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="last:border-0">
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>
                <RichText value={item.a} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      );
    case "tabs":
      return (
        <Tabs defaultValue="tab-0" className="not-prose">
          <TabsList>
            {block.items.map((item, i) => (
              <TabsTrigger key={i} value={`tab-${i}`}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {block.items.map((item, i) => (
            <TabsContent key={i} value={`tab-${i}`} className="text-[15px] leading-7 text-muted-foreground">
              <RichText value={item.content} />
            </TabsContent>
          ))}
        </Tabs>
      );
    case "expand":
      return (
        <Collapsible className="not-prose rounded-card border border-border">
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 p-4 text-left text-base font-medium transition-ui hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {block.summary}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 text-[15px] leading-7 text-muted-foreground">
            <RichText value={block.content} />
          </CollapsibleContent>
        </Collapsible>
      );

    /* — Embeds — */
    case "socialEmbed":
      return <SocialEmbed author={block.author} handle={block.handle} text={block.text} date={block.date} />;
    case "map":
      return <MapEmbed query={block.query} label={block.label} />;

    /* — Data & statistics — */
    case "statCards":
      return <StatCards stats={block.stats} />;
    case "metricsGrid":
      return <MetricsGrid metrics={block.metrics} />;
    case "progress":
      return <ProgressBlock label={block.label} value={block.value} />;
    case "comparisonCards":
      return <ComparisonCards cards={block.cards} />;

    /* — Utility — */
    case "divider":
      return <Separator className="my-2" />;
    case "spacer":
      return <Spacer size={block.size} />;
    case "tags":
      return <Tags items={block.items} />;

    /* — Conversion — */
    case "cta":
      return <CtaBanner title={block.title} text={block.text} button={block.button} href={block.href} />;
    case "newsletter":
      return (
        <div className="not-prose rounded-card border border-border bg-muted/30 p-6 text-center">
          <h4 className="font-display text-lg font-bold tracking-tight">{block.title}</h4>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{block.text}</p>
          <NewsletterForm className="mx-auto mt-4 max-w-md" />
        </div>
      );
    case "download":
      return (
        <DownloadCard title={block.title} description={block.description} meta={block.meta} button={block.button} />
      );
    case "buttonGroup":
      return <ButtonGroup buttons={block.buttons} />;

    /* — Knowledge — */
    case "takeaways":
      return <KeyTakeaways title={block.title} items={block.items} />;
    case "summary":
      return <SummaryBox title={block.title} text={block.text} />;
    case "prosCons":
      return <ProsCons pros={block.pros} cons={block.cons} />;
    case "steps":
      return <StepGuide items={block.items} />;
    case "timeline":
      return <Timeline items={block.items} className="not-prose ml-2" />;
    case "references":
      return <References items={block.items} />;
    case "footnotes":
      return <Footnotes items={block.items} />;

    /* — Advanced — */
    case "authorNote":
      return <AuthorNote text={block.text} />;
    case "expertInsight":
      return <ExpertInsight name={block.name} role={block.role} quote={block.quote} />;
    case "relatedCard": {
      const rel = getPost(block.slug);
      if (!rel) return null;
      return (
        <div className="not-prose">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Related reading
          </div>
          <PostCard post={rel} />
        </div>
      );
    }
    case "resourceList":
      return <ResourceList items={block.items} />;
    case "quickFacts":
      return <QuickFacts title={block.title} facts={block.facts} />;

    default:
      return null;
  }
}

export function ArticleBody({ blocks, affiliateDomains }: { blocks: ContentBlock[]; affiliateDomains?: string[] }) {
  return (
    <AffiliateProvider domains={affiliateDomains}>
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-col gap-7">
          {blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </TooltipProvider>
    </AffiliateProvider>
  );
}
