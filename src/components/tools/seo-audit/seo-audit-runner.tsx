"use client";

import * as React from "react";
import { ArrowRight, Check, Loader2, Search, Sparkles, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EMAIL_RE } from "@/lib/validation/email";
import { cn } from "@/lib/utils";
import { ShareResult } from "@/components/tools/share-result";
import type { AuditView, CategoryScore, Finding, Opportunity, Severity, TopicNode } from "@/lib/seo-audit/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Ordered job states → the honest progress checklist (spec §21). We only ever
// tick a step once the backend has actually reached that state.
const FREE_STEPS = [
  { key: "queued", label: "Starting the audit" },
  { key: "crawling", label: "Crawling your website" },
  { key: "scoring", label: "Scoring SEO & AI-visibility signals" },
  { key: "ready", label: "Building your report" },
];
const DEEP_STEPS = [
  { key: "analyzing", label: "Analyzing AI visibility & content opportunities" },
  { key: "complete", label: "Writing your full report" },
];
const ORDER = ["queued", "discovering", "crawling", "scoring", "ready", "analyzing", "complete"];

// Never assume an affected-URL string is a valid absolute URL — a site-level
// finding may carry a label. Fall back to the raw string instead of throwing.
function pathOf(u: string): string {
  try {
    return new URL(u).pathname || u;
  } catch {
    return u;
  }
}

function colorFor(score: number): string {
  if (score >= 85) return "bg-success";
  if (score >= 70) return "bg-warning";
  if (score >= 50) return "bg-orange-500";
  return "bg-danger";
}
const SEV_TONE: Record<Severity, "danger" | "warning" | "muted"> = { critical: "danger", high: "danger", medium: "warning", low: "muted" };

export function SeoAuditRunner() {
  const [url, setUrl] = React.useState("");
  const [phase, setPhase] = React.useState<"idle" | "running" | "ready" | "analyzing" | "error">("idle");
  const [status, setStatus] = React.useState("queued");
  const [progress, setProgress] = React.useState(0);
  const [view, setView] = React.useState<AuditView | null>(null);
  const [error, setError] = React.useState("");
  const idRef = React.useRef<string>("");

  async function pollUntil(id: string, stop: string[]) {
    for (;;) {
      const res = await fetch("/api/tools/seo-audit/step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Audit step failed.");
      setStatus(j.status);
      setProgress(j.progress);
      if (stop.includes(j.status)) break;
      await sleep(300);
    }
    const v = await fetch(`/api/tools/seo-audit/${id}`);
    const data = await v.json();
    if (!v.ok) throw new Error(data.error ?? "Couldn't load the report.");
    return data as AuditView;
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setPhase("running");
    setError("");
    setView(null);
    setProgress(0);
    setStatus("queued");
    try {
      const res = await fetch("/api/tools/seo-audit/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Couldn't start the audit.");
      idRef.current = j.id;
      const v = await pollUntil(j.id, ["ready", "complete", "failed"]);
      setView(v);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  }

  async function onUnlocked() {
    // Email captured server-side; resume polling through the deep LLM pass.
    setPhase("analyzing");
    setStatus("analyzing");
    try {
      const v = await pollUntil(idRef.current, ["complete", "failed"]);
      setView(v);
      setPhase("ready");
    } catch {
      // Deep pass hiccup — keep the free report visible rather than erroring out.
      setPhase("ready");
    }
  }

  return (
    <div className="grid gap-6">
      {(phase === "idle" || phase === "error") && (
        <form onSubmit={run} className="flex flex-col gap-3 sm:flex-row">
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourwebsite.com" className="flex-1" />
          <Button type="submit" className="w-fit shrink-0">
            Audit my website
            <ArrowRight />
          </Button>
        </form>
      )}
      {phase !== "idle" && phase !== "error" && (
        <div className="text-sm text-muted-foreground">
          Auditing <span className="font-medium text-foreground">{view?.url ?? url}</span>
        </div>
      )}
      {(phase === "idle" || phase === "error") && (
        <Badge variant="muted" className="w-fit">Free SEO + AI-visibility audit · no signup for the core report</Badge>
      )}

      {phase === "error" && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(phase === "running" || phase === "analyzing") && (
        <ProgressChecklist status={status} progress={progress} deep={phase === "analyzing"} />
      )}

      {(phase === "ready" || phase === "analyzing") && view?.scores && (
        <Report view={view} analyzing={phase === "analyzing"} onUnlocked={onUnlocked} auditId={idRef.current} />
      )}
    </div>
  );
}

function ProgressChecklist({ status, progress, deep }: { status: string; progress: number; deep: boolean }) {
  const steps = deep ? DEEP_STEPS : FREE_STEPS;
  const cur = ORDER.indexOf(status);
  return (
    <div className="rounded-card border border-border bg-card p-6">
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <ul className="flex flex-col gap-3">
        {steps.map((s) => {
          const idx = ORDER.indexOf(s.key);
          const done = cur > idx;
          const active = cur === idx;
          return (
            <li key={s.key} className={cn("flex items-center gap-3 text-sm", done ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground")}>
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", done ? "border-success bg-success/10" : active ? "border-foreground" : "border-border")}>
                {done ? <Check className="size-3 text-success" /> : active ? <Loader2 className="size-3 animate-spin" /> : null}
              </span>
              {s.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Report({ view, analyzing, onUnlocked, auditId }: { view: AuditView; analyzing: boolean; onUnlocked: () => void; auditId: string }) {
  const s = view.scores!;
  return (
    <div className="grid gap-6">
      {/* Score header */}
      <div className="rounded-card border border-border bg-card p-6 md:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your visibility score</div>
        <div className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-6">
          <div>
            <div className="font-display text-6xl font-extrabold tracking-tight tabular-nums">{s.overall}</div>
            <div className="text-sm text-muted-foreground">out of 100</div>
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <ScoreBar label="SEO" score={s.seo} sub="Can search engines crawl, understand and rank it" />
            <ScoreBar label="AI Visibility" score={s.ai} sub="Can AI systems understand, extract and cite it" />
          </div>
        </div>
        {view.pageCount ? <div className="mt-4 text-xs text-muted-foreground">{view.pageCount} pages analyzed · {view.domain}</div> : null}
      </div>

      {/* Biggest opportunity (post-unlock) */}
      {view.report?.opportunitySummary && (
        <div className="rounded-card border border-foreground/15 bg-foreground/[0.03] p-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4" /> Your biggest opportunity</div>
          <p className="mt-2 text-[15px] leading-7 text-foreground/90">{view.report.opportunitySummary}</p>
        </div>
      )}

      {/* Category breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <CategoryPanel title="Traditional SEO" cats={s.seoCategories} />
        <CategoryPanel title="AI Visibility" cats={s.aiCategories} />
      </div>

      {/* Findings */}
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {view.reportStatus === "unlocked" ? "Findings" : "Top findings"}
          </h3>
          {view.reportStatus === "free" && view.findingsTotal > view.findings.length && (
            <span className="text-xs text-muted-foreground">{view.findings.length} of {view.findingsTotal} shown</span>
          )}
        </div>
        <div className="mt-3 grid gap-3">
          {view.findings.map((f) => <FindingCard key={f.id} f={f} />)}
        </div>
      </div>

      {/* Opportunities + topic map + action plan (post-unlock) */}
      {view.report && (
        <>
          <OpportunityList items={view.report.opportunities} />
          {view.report.topicMap.length > 0 && <TopicMap nodes={view.report.topicMap} />}
          <ActionPlan plan={view.report.actionPlan} />
          <ServiceCta auditId={auditId} score={s.overall} />
        </>
      )}

      {/* Email gate (free tier) */}
      {view.reportStatus === "free" && !analyzing && <EmailGate auditId={auditId} findingsTotal={view.findingsTotal} onUnlocked={onUnlocked} />}
      {analyzing && (
        <div className="flex items-center gap-3 rounded-card border border-border bg-card p-5 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Building your full report — analyzing answerability, entities and content gaps…
        </div>
      )}

      {view.reportStatus === "free" && (
        <ShareResult tool="SEO + AI Visibility Audit" score={s.overall} label="Visibility Score" />
      )}
    </div>
  );
}

function ScoreBar({ label, score, sub }: { label: string; score: number; sub: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-display text-xl font-bold tabular-nums">{score}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", colorFor(score))} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{sub}</p>
    </div>
  );
}

function CategoryPanel({ title, cats }: { title: string; cats: CategoryScore[] }) {
  if (!cats.length) return null;
  return (
    <div className="rounded-card border border-border p-5">
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {cats.map((c) => (
          <li key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div>
              <div className="text-[13px]">{c.label}</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", colorFor(c.score))} style={{ width: `${c.score}%` }} />
              </div>
            </div>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">{c.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FindingCard({ f }: { f: Finding }) {
  return (
    <div className="rounded-card border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium">{f.title}</div>
        <div className="flex shrink-0 gap-1.5">
          <Badge variant="outline" className="uppercase">{f.category === "ai" ? "AI" : "SEO"}</Badge>
          <Badge variant={SEV_TONE[f.severity]}>{f.severity}</Badge>
        </div>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{f.why}</p>
      {f.evidence && <p className="mt-1.5 text-xs text-muted-foreground">Evidence: {f.evidence}</p>}
      {f.affectedUrls.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5">
          {f.affectedUrls.slice(0, 5).map((u) => (
            <li key={u} className="truncate font-mono text-xs text-muted-foreground">{pathOf(u)}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-sm"><span className="font-medium">Fix: </span>{f.recommendation}</p>
    </div>
  );
}

function OpportunityList({ items }: { items: Opportunity[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">What we&rsquo;d fix first</h3>
      <ol className="mt-3 flex flex-col gap-3">
        {[...items].sort((a, b) => a.rank - b.rank).map((o) => (
          <li key={o.rank} className="flex gap-4 rounded-card border border-border p-4">
            <span className="font-display text-lg font-bold text-muted-foreground tabular-nums">{String(o.rank).padStart(2, "0")}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{o.title}</span>
                <Badge variant="outline" className="uppercase">{o.category === "ai" ? "AI" : "SEO"}</Badge>
                <Badge variant={SEV_TONE[o.impact]}>{o.impact} impact</Badge>
                <Badge variant="muted">{o.effort} effort</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{o.summary}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TopicMap({ nodes }: { nodes: TopicNode[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Topical coverage</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {nodes.map((n) => (
          <li key={n.topic} className="rounded-card border border-border p-3">
            <TopicRow node={n} />
            {n.children && n.children.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5 pl-4">
                {n.children.map((c) => (
                  <Badge key={c.topic} variant={c.covered ? "success" : "outline"} className={cn(!c.covered && "text-muted-foreground")}>
                    {c.covered ? "" : "Gap: "}{c.topic}
                  </Badge>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
function TopicRow({ node }: { node: TopicNode }) {
  return (
    <span className="flex items-center gap-2 text-sm font-medium">
      <span className={cn("size-1.5 rounded-full", node.covered ? "bg-success" : "bg-muted-foreground")} />
      {node.topic}
    </span>
  );
}

function ActionPlan({ plan }: { plan: { now: string[]; next: string[]; later: string[] } }) {
  const cols: { label: string; items: string[] }[] = [
    { label: "Now", items: plan.now },
    { label: "Next", items: plan.next },
    { label: "Later", items: plan.later },
  ];
  if (cols.every((c) => c.items.length === 0)) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recommended action plan</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {cols.map((c) => (
          <div key={c.label} className="rounded-card border border-border p-4">
            <div className="text-sm font-semibold">{c.label}</div>
            <ul className="mt-2 flex flex-col gap-2">
              {c.items.map((it, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailGate({ auditId, findingsTotal, onUnlocked }: { auditId: string; findingsTotal: number; onUnlocked: () => void }) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    fetch("/api/tools/seo-audit/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: auditId, event: "email_gate_viewed" }) }).catch(() => {});
  }, [auditId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid work email.");
      setState("error");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/tools/seo-audit/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: auditId, email }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Couldn't send your report.");
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <div className="rounded-card border border-foreground/15 bg-foreground/[0.03] p-6">
      <div className="flex items-center gap-2 font-semibold"><Lock className="size-4" /> Want the full report?</div>
      <p className="mt-1 text-sm text-muted-foreground">
        We&rsquo;ll unlock every issue{findingsTotal ? ` (${findingsTotal} in total)` : ""}, the affected pages, your AI-visibility opportunities and a prioritized action plan — and email you a copy.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }} placeholder="you@company.com" className="flex-1" aria-invalid={state === "error"} />
        <Button type="submit" loading={state === "loading"} className="shrink-0">Get my full report<ArrowRight /></Button>
      </form>
      {state === "error" && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

function ServiceCta({ auditId, score }: { auditId: string; score: number }) {
  function onClick() {
    fetch("/api/tools/seo-audit/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: auditId, event: "cta_clicked" }) }).catch(() => {});
  }
  return (
    <div className="rounded-card border border-border bg-card p-6 text-center">
      <AlertTriangle className="mx-auto size-5 text-muted-foreground" aria-hidden />
      <h3 className="mt-2 text-lg font-bold tracking-tight">Want help improving your visibility across Google and AI search?</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {score < 70 ? "There's clear room to improve how search engines and AI systems find, understand and cite your site." : "You've got solid foundations — let's turn them into consistent AI-answer and search visibility."}
      </p>
      <a href="/contact?ref=seo-audit" onClick={onClick} className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90">
        <Search className="size-4" /> Talk about your AI visibility
      </a>
    </div>
  );
}
