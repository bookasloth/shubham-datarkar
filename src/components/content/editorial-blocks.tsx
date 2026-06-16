import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  CircleX,
  FileText,
  Info,
  Lightbulb,
  Minus,
  NotebookPen,
  Quote as QuoteIcon,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import type { RichText as RichTextValue, Stat } from "@/lib/data/types";
import { RichText } from "@/components/content/rich-text";
import { Alert, AlertDescription, AlertTitle, type AlertProps } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCounter } from "@/components/ui/stat-counter";
import { Stepper } from "@/components/ui/stepper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ===================== CALLOUTS ===================== */
const calloutMap: Record<
  string,
  { variant: AlertProps["variant"]; icon: React.ReactNode; label: string }
> = {
  note: { variant: "default", icon: <NotebookPen />, label: "Note" },
  tip: { variant: "accent", icon: <Lightbulb />, label: "Tip" },
  info: { variant: "info", icon: <Info />, label: "Info" },
  success: { variant: "success", icon: <CircleCheck />, label: "Success" },
  warning: { variant: "warning", icon: <TriangleAlert />, label: "Warning" },
  error: { variant: "danger", icon: <CircleX />, label: "Error" },
};

export function Callout({
  variant = "default",
  title,
  text,
}: {
  variant?: string;
  title?: string;
  text: RichTextValue;
}) {
  const m = calloutMap[variant];
  if (!m) {
    // Legacy "default"/"info"/"accent" callouts with no icon.
    return (
      <Alert variant={(variant as AlertProps["variant"]) ?? "default"}>
        <div>
          {title && <AlertTitle>{title}</AlertTitle>}
          <AlertDescription className={title ? "" : "mt-0 text-foreground"}>
            <RichText value={text} />
          </AlertDescription>
        </div>
      </Alert>
    );
  }
  return (
    <Alert variant={m.variant}>
      {m.icon}
      <div>
        <AlertTitle>{title ?? m.label}</AlertTitle>
        <AlertDescription>
          <RichText value={text} />
        </AlertDescription>
      </div>
    </Alert>
  );
}

/* ===================== PULL QUOTE ===================== */
export function PullQuote({ text, cite }: { text: string; cite?: string }) {
  return (
    <figure className="my-2 border-y border-border py-8 text-center">
      <QuoteIcon className="mx-auto size-6 text-foreground/30" aria-hidden />
      <blockquote className="mx-auto mt-3 max-w-2xl text-balance font-display text-2xl font-bold leading-snug tracking-tight md:text-3xl">
        {text}
      </blockquote>
      {cite && <figcaption className="mt-4 text-sm text-muted-foreground">— {cite}</figcaption>}
    </figure>
  );
}

/* ===================== TABLES ===================== */
export function TableBlock({
  columns,
  rows,
  caption,
}: {
  columns: string[];
  rows: RichTextValue[][];
  caption?: RichTextValue;
}) {
  return (
    <figure className="not-prose">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c, i) => (
              <TableHead key={i}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <TableRow key={ri}>
              {row.map((cell, ci) => (
                <TableCell key={ci} className={ci === 0 ? "font-medium" : "text-muted-foreground"}>
                  <RichText value={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          <RichText value={caption} />
        </figcaption>
      )}
    </figure>
  );
}

export function ComparisonTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: { label: string; cells: (boolean | string)[] }[];
}) {
  return (
    <div className="not-prose">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Capability</TableHead>
            {columns.map((c, i) => (
              <TableHead key={i} className="text-center">
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, ri) => (
            <TableRow key={ri}>
              <TableCell className="font-medium">{row.label}</TableCell>
              {row.cells.map((cell, ci) => (
                <TableCell key={ci} className="text-center">
                  {typeof cell === "boolean" ? (
                    cell ? (
                      <Check className="mx-auto size-4 text-success" aria-label="Yes" />
                    ) : (
                      <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="No" />
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">{cell}</span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ===================== DATA & STATS ===================== */
export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="not-prose grid gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label} className="p-5">
          <div className="font-display text-3xl font-extrabold tracking-tight">{s.value}</div>
          <div className="mt-1 text-sm font-medium">{s.label}</div>
          {s.sub && <div className="mt-0.5 text-xs text-muted-foreground">{s.sub}</div>}
        </Card>
      ))}
    </div>
  );
}

export function MetricsGrid({
  metrics,
}: {
  metrics: { value: number; prefix?: string; suffix?: string; decimals?: number; label: string }[];
}) {
  return (
    <div className="not-prose grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card p-6">
          <div className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            <StatCounter
              value={m.value}
              prefix={m.prefix}
              suffix={m.suffix}
              decimals={m.decimals ?? 0}
            />
          </div>
          <div className="mt-2 text-sm font-medium">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

export function ProgressBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="not-prose">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

export function ComparisonCards({
  cards,
}: {
  cards: { title: string; subtitle?: string; rows: { label: string; value: string }[]; highlight?: boolean }[];
}) {
  return (
    <div className="not-prose grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={cn("p-6", card.highlight && "border-foreground ring-1 ring-foreground")}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-display text-lg font-bold tracking-tight">{card.title}</h4>
            {card.highlight && <Badge>Recommended</Badge>}
          </div>
          {card.subtitle && <p className="mt-1 text-sm text-muted-foreground">{card.subtitle}</p>}
          <dl className="mt-4 space-y-2.5">
            {card.rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                <dt className="text-sm text-muted-foreground">{r.label}</dt>
                <dd className="text-sm font-medium">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  );
}

/* ===================== CONVERSION ===================== */
export function CtaBanner({
  title,
  text,
  button,
  href,
}: {
  title: string;
  text: string;
  button: string;
  href: string;
}) {
  return (
    <div className="not-prose flex flex-col items-start gap-5 rounded-card bg-foreground p-8 text-background sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-display text-xl font-bold tracking-tight">{title}</p>
        <p className="mt-1 text-sm text-background/70">{text}</p>
      </div>
      <Button asChild className="shrink-0 bg-background text-foreground hover:bg-background/90">
        <Link href={href}>
          {button} <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

export function DownloadCard({
  title,
  description,
  meta,
  button = "Download",
}: {
  title: string;
  description: string;
  meta: string;
  button?: string;
}) {
  return (
    <Card className="not-prose flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-card bg-muted">
        <FileText className="size-5" aria-hidden />
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
      </div>
      <Button variant="outline" className="shrink-0">
        <BrandIcon name="Download" /> {button}
      </Button>
    </Card>
  );
}

export function ButtonGroup({
  buttons,
}: {
  buttons: { label: string; href: string; variant?: "default" | "outline" | "secondary" | "ghost" }[];
}) {
  return (
    <div className="not-prose flex flex-wrap gap-3">
      {buttons.map((b) => (
        <Button key={b.label} asChild variant={b.variant ?? "default"}>
          <Link href={b.href}>{b.label}</Link>
        </Button>
      ))}
    </div>
  );
}

/* ===================== UTILITY ===================== */
export function Tags({ items }: { items: string[] }) {
  return (
    <div className="not-prose flex flex-wrap gap-2">
      {items.map((t) => (
        <span
          key={t}
          className="rounded-btn bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
        >
          #{t}
        </span>
      ))}
    </div>
  );
}

export function Spacer({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <div aria-hidden className={cn(size === "sm" && "h-4", size === "md" && "h-10", size === "lg" && "h-20")} />;
}

/* ===================== KNOWLEDGE ===================== */
export function KeyTakeaways({ title = "Key takeaways", items }: { title?: string; items: RichTextValue[] }) {
  return (
    <aside className="not-prose rounded-card border border-border bg-muted/30 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4" aria-hidden />
        <h4 className="font-display text-sm font-bold uppercase tracking-[0.12em]">{title}</h4>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
            <Check className="mt-1 size-4 shrink-0 text-foreground" aria-hidden />
            <span>
              <RichText value={item} />
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function SummaryBox({ title = "In summary", text }: { title?: string; text: RichTextValue }) {
  return (
    <aside className="not-prose rounded-card border-l-2 border-l-foreground border-y border-r border-border bg-card p-6">
      <h4 className="font-display text-base font-bold tracking-tight">{title}</h4>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        <RichText value={text} />
      </p>
    </aside>
  );
}

export function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="not-prose grid gap-4 sm:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-2 text-success">
          <ThumbsUp className="size-4" aria-hidden />
          <h4 className="text-sm font-bold uppercase tracking-wider">Pros</h4>
        </div>
        <ul className="mt-3 space-y-2">
          {pros.map((p) => (
            <li key={p} className="flex gap-2.5 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {p}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2 text-danger">
          <ThumbsDown className="size-4" aria-hidden />
          <h4 className="text-sm font-bold uppercase tracking-wider">Cons</h4>
        </div>
        <ul className="mt-3 space-y-2">
          {cons.map((c) => (
            <li key={c} className="flex gap-2.5 text-sm">
              <Minus className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> {c}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function StepGuide({ items }: { items: { title: string; detail: RichTextValue }[] }) {
  return (
    <div className="not-prose">
      <Stepper steps={items.map((s) => ({ label: s.title }))} current={items.length} className="mb-8 hidden md:flex" />
      <ol className="space-y-5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-sm font-bold text-background">
              {i + 1}
            </span>
            <div className="pt-0.5">
              <h4 className="font-semibold">{s.title}</h4>
              <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
                <RichText value={s.detail} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function References({ items }: { items: { label: string; href: string; source?: string }[] }) {
  return (
    <section aria-label="References" className="not-prose rounded-card border border-border p-6">
      <h4 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">References</h4>
      <ol className="mt-4 space-y-2.5">
        {items.map((r, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="font-display text-xs font-bold tabular-nums text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <Link
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-baseline gap-1 underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              {r.label}
              {r.source && <span className="text-muted-foreground"> — {r.source}</span>}
              <ArrowUpRight className="size-3 shrink-0 self-center text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Footnotes({ items }: { items: { n: number; text: RichTextValue }[] }) {
  return (
    <section aria-label="Footnotes" className="not-prose border-t border-border pt-6">
      <h4 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">Footnotes</h4>
      <ol className="mt-4 space-y-2.5">
        {items.map((f) => (
          <li key={f.n} id={`fn-${f.n}`} className="flex gap-3 text-sm text-muted-foreground">
            <span className="font-display text-xs font-bold tabular-nums">{f.n}.</span>
            <span>
              <RichText value={f.text} />{" "}
              <a href={`#fnref-${f.n}`} className="text-foreground underline-offset-2 hover:underline" aria-label="Back to content">
                ↩
              </a>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ===================== ADVANCED ===================== */
export function AuthorNote({ text }: { text: RichTextValue }) {
  return (
    <aside className="not-prose flex gap-4 rounded-card bg-muted/40 p-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-xs font-bold text-background">
        SD
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Author note</div>
        <p className="mt-1 text-[15px] italic leading-relaxed text-foreground/90">
          <RichText value={text} />
        </p>
      </div>
    </aside>
  );
}

export function ExpertInsight({ name, role, quote }: { name: string; role: string; quote: RichTextValue }) {
  return (
    <aside className="not-prose rounded-card border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Badge variant="outline">Expert insight</Badge>
      </div>
      <blockquote className="mt-3 text-[17px] leading-relaxed text-foreground/90">
        <RichText value={quote} />
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted font-display text-xs font-bold">
          {name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground">{role}</div>
        </div>
      </figcaption>
    </aside>
  );
}

export function ResourceList({ items }: { items: { title: string; kind: string; href: string }[] }) {
  return (
    <div className="not-prose divide-y divide-border rounded-card border border-border">
      {items.map((r) => (
        <Link
          key={r.title}
          href={r.href}
          className="group flex items-center gap-4 p-4 transition-ui hover:bg-accent"
        >
          <Badge variant="muted" className="shrink-0">
            {r.kind}
          </Badge>
          <span className="flex-1 text-sm font-medium">{r.title}</span>
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

export function QuickFacts({ title = "Quick facts", facts }: { title?: string; facts: { label: string; value: string }[] }) {
  return (
    <aside className="not-prose rounded-card border border-border bg-muted/30 p-6">
      <h4 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">{title}</h4>
      <dl className="mt-4 space-y-3">
        {facts.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2.5 last:border-0">
            <dt className="text-sm text-muted-foreground">{f.label}</dt>
            <dd className="text-right text-sm font-semibold">{f.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
