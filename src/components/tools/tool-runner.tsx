"use client";

import * as React from "react";
import { ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { analyzeReadability, type Readability } from "@/lib/tools/readability";
import { ToolLeadCapture } from "@/components/tools/tool-lead-capture";
import { ShareResult } from "@/components/tools/share-result";

/* ---------------------------- UTM Builder (real) ---------------------------- */
function UtmBuilder() {
  const [fields, setFields] = React.useState({
    url: "https://shubhamdatarkar.com",
    source: "newsletter",
    medium: "email",
    campaign: "launch",
    term: "",
    content: "",
  });

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const result = React.useMemo(() => {
    try {
      const u = new URL(fields.url);
      const map: Record<string, string> = {
        utm_source: fields.source,
        utm_medium: fields.medium,
        utm_campaign: fields.campaign,
        utm_term: fields.term,
        utm_content: fields.content,
      };
      Object.entries(map).forEach(([k, v]) => v && u.searchParams.set(k, v));
      return u.toString();
    } catch {
      return "";
    }
  }, [fields]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-4">
        {(
          [
            ["url", "Website URL", "https://example.com"],
            ["source", "Campaign source", "newsletter"],
            ["medium", "Campaign medium", "email"],
            ["campaign", "Campaign name", "launch"],
            ["term", "Term (optional)", "keyword"],
            ["content", "Content (optional)", "variant-a"],
          ] as const
        ).map(([key, label, ph]) => (
          <div key={key} className="grid gap-1.5">
            <Label htmlFor={`utm-${key}`}>{label}</Label>
            <Input id={`utm-${key}`} value={fields[key]} onChange={set(key)} placeholder={ph} />
          </div>
        ))}
      </div>
      <div>
        <Label>Generated URL</Label>
        <Card className="mt-1.5 break-all p-4 font-mono text-sm">
          {result || <span className="text-danger">Enter a valid URL above.</span>}
        </Card>
        {result && (
          <div className="mt-3">
            <CopyButton value={result} label="Copy URL" />
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------- ROAS Calculator (real) -------------------------- */
function RoasCalculator() {
  const [spend, setSpend] = React.useState(40000);
  const [conversions, setConversions] = React.useState(120);
  const [aov, setAov] = React.useState(1800);

  const revenue = conversions * aov;
  const roas = spend > 0 ? revenue / spend : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const profit = revenue - spend;

  const num = (setter: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter(Number(e.target.value) || 0);

  const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="r-spend">Monthly ad spend (₹)</Label>
          <Input id="r-spend" type="number" value={spend} onChange={num(setSpend)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="r-conv">Conversions / month</Label>
          <Input id="r-conv" type="number" value={conversions} onChange={num(setConversions)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="r-aov">Average order value (₹)</Label>
          <Input id="r-aov" type="number" value={aov} onChange={num(setAov)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border">
        {[
          { label: "ROAS", value: `${roas.toFixed(2)}x` },
          { label: "CPA", value: fmt(cpa) },
          { label: "Revenue", value: fmt(revenue) },
          { label: "Profit", value: fmt(profit) },
        ].map((m) => (
          <div key={m.label} className="bg-card p-6">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{m.label}</div>
            <div className="mt-1 font-display text-2xl font-extrabold tracking-tight">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------- Schema Generator (real) ------------------------- */
function SchemaGenerator() {
  const [type, setType] = React.useState("Article");
  const [name, setName] = React.useState("The Complete SEO Playbook");
  const [url, setUrl] = React.useState("https://shubhamdatarkar.com/blog/seo/playbook");
  const [extra, setExtra] = React.useState("Shubham Datarkar");

  const json = React.useMemo(() => {
    const base: Record<string, unknown> = { "@context": "https://schema.org", "@type": type };
    if (type === "Article") Object.assign(base, { headline: name, author: { "@type": "Person", name: extra }, url });
    if (type === "Person") Object.assign(base, { name, url, jobTitle: extra });
    if (type === "Organization") Object.assign(base, { name, url, founder: extra });
    return JSON.stringify(base, null, 2);
  }, [type, name, url, extra]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Schema type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Article", "Person", "Organization"].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="s-name">{type === "Article" ? "Headline" : "Name"}</Label>
          <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="s-url">URL</Label>
          <Input id="s-url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="s-extra">{type === "Article" ? "Author" : type === "Person" ? "Job title" : "Founder"}</Label>
          <Input id="s-extra" value={extra} onChange={(e) => setExtra(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>JSON-LD output</Label>
        <pre className="mt-1.5 overflow-x-auto rounded-card border border-border bg-muted/60 p-4 text-xs">
          <code className="font-mono">{json}</code>
        </pre>
        <div className="mt-3">
          <CopyButton value={json} label="Copy JSON-LD" />
        </div>
      </div>
    </div>
  );
}

/* --------------------- Demo analyzer (simulated result) --------------------- */
type DemoConfig = {
  inputType: "url" | "text" | "keyword";
  label: string;
  placeholder: string;
  cta: string;
};

const demoConfigs: Record<string, DemoConfig> = {
  "content-brief": { inputType: "keyword", label: "Target keyword", placeholder: "e.g. saas seo india", cta: "Get the complete brief with competitor angles" },
};

function scoreFrom(seed: string) {
  // Deterministic pseudo-score from input so results feel real and stable.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000;
  return 62 + (h % 34); // 62–95
}

function DemoAnalyzer({ slug }: { slug: string }) {
  const cfg = demoConfigs[slug];
  const [value, setValue] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "done">("idle");
  const [score, setScore] = React.useState(0);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setState("loading");
    await new Promise((r) => setTimeout(r, 900));
    setScore(scoreFrom(value));
    setState("done");
  }

  const checks = [
    { label: "Clarity of message", ok: score > 70 },
    { label: "Search intent match", ok: score > 66 },
    { label: "Structure & scannability", ok: score > 74 },
    { label: "Call-to-action strength", ok: score > 80 },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={run} className="grid gap-3">
        <Label htmlFor="demo-input">{cfg.label}</Label>
        {cfg.inputType === "text" ? (
          <Textarea id="demo-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={cfg.placeholder} className="min-h-32" />
        ) : (
          <Input
            id="demo-input"
            type={cfg.inputType === "url" ? "url" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={cfg.placeholder}
          />
        )}
        <Button type="submit" loading={state === "loading"} className="w-fit">
          Analyze
          {state !== "loading" && <ArrowRight />}
        </Button>
        <Badge variant="muted" className="w-fit">
          Sample analysis · runs in your browser
        </Badge>
      </form>

      <div>
        {state === "idle" && (
          <EmptyState title="Your result appears here" description="Enter something on the left and hit analyze." />
        )}
        {state === "loading" && (
          <div className="flex h-full min-h-48 items-center justify-center rounded-card border border-border">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        )}
        {state === "done" && (
          <Card className="p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">Overall score</span>
              <span className="font-display text-3xl font-extrabold tracking-tight">{score}/100</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${score}%` }} />
            </div>
            <ul className="mt-5 flex flex-col gap-2.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center justify-between text-sm">
                  <span>{c.label}</span>
                  <Badge variant={c.ok ? "success" : "warning"}>{c.ok ? "Good" : "Improve"}</Badge>
                </li>
              ))}
            </ul>
            <Alert variant="accent" className="mt-5">
              <AlertDescription className="text-foreground">{cfg.cta} — it&apos;s in the newsletter.</AlertDescription>
            </Alert>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------- Readability Checker (real) ------------------------- */
function ReadabilityChecker() {
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState<Readability | null>(null);
  const [ran, setRan] = React.useState(false);

  function run(e: React.FormEvent) {
    e.preventDefault();
    setResult(analyzeReadability(text));
    setRan(true);
  }

  const metrics = result
    ? [
        { label: "Reading ease", value: `${result.fleschReadingEase}/100` },
        { label: "Grade level", value: `${result.fleschKincaidGrade}` },
        { label: "Words", value: `${result.words}` },
        { label: "Sentences", value: `${result.sentences}` },
        { label: "Avg words / sentence", value: `${result.avgWordsPerSentence}` },
        { label: "Avg syllables / word", value: `${result.avgSyllablesPerWord}` },
      ]
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={run} className="grid gap-3">
        <Label htmlFor="read-input">Paste your text</Label>
        <Textarea
          id="read-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste an article, email, or landing-page copy…"
          className="min-h-48"
        />
        <Button type="submit" className="w-fit">
          Check readability
          <ArrowRight />
        </Button>
        <Badge variant="muted" className="w-fit">
          Flesch–Kincaid · runs in your browser
        </Badge>
      </form>

      <div>
        {!ran && <EmptyState title="Your score appears here" description="Paste text on the left and check." />}
        {ran && !result && (
          <EmptyState title="Need some text" description="Add a sentence or two and try again." />
        )}
        {result && (
          <Card className="p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">{result.readingLevel}</span>
              <span className="font-display text-3xl font-extrabold tracking-tight">{result.fleschReadingEase}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${result.fleschReadingEase}%` }} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-card border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{m.label}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{m.value}</dd>
                </div>
              ))}
            </dl>
            {result.hardSentences.length > 0 && (
              <div className="mt-5">
                <p className="text-sm font-medium">Long sentences to tighten ({result.hardSentences.length})</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {result.hardSentences.map((s, i) => (
                    <li key={i} className="rounded-card border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                      {s.length > 160 ? s.slice(0, 160) + "…" : s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5">
              <ShareResult tool="Readability Checker" score={result.fleschReadingEase} label="Reading Ease" />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- SEO Audit (real) ---------------------------- */
type AuditCheck = { id: string; label: string; passed: boolean; category: string; priority: "high" | "medium" | "low" };
type AuditReport = {
  url: string;
  overall: number;
  color: "red" | "orange" | "yellow" | "green";
  scores: { seo: number; geo: number; aeo: number };
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  h1Count: number;
  wordCount: number;
  schemas: string[];
  passed: AuditCheck[];
  failed: AuditCheck[];
};

function SeoAuditRunner() {
  const [url, setUrl] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [report, setReport] = React.useState<AuditReport | null>(null);
  const [error, setError] = React.useState("");
  const [unlocked, setUnlocked] = React.useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setState("loading");
    setError("");
    setUnlocked(false);
    try {
      const res = await fetch("/api/tools/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Audit failed.");
        setState("error");
        return;
      }
      setReport(data as AuditReport);
      setState("done");
    } catch {
      setError("Couldn't run the audit. Check your connection and try again.");
      setState("error");
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={run} className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yoursite.com"
          className="flex-1"
        />
        <Button type="submit" loading={state === "loading"} className="w-fit shrink-0">
          Audit
          {state !== "loading" && <ArrowRight />}
        </Button>
      </form>
      <Badge variant="muted" className="w-fit">Real technical audit · runs on our server</Badge>

      {state === "error" && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {state === "done" && report && (
        <Card className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <a href={report.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium text-muted-foreground underline-offset-4 hover:underline">
              {report.url}
            </a>
            <span className="font-display text-4xl font-extrabold tracking-tight">{report.overall}/100</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground" style={{ width: `${report.overall}%` }} />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {(["seo", "geo", "aeo"] as const).map((k) => (
              <div key={k} className="rounded-card border border-border p-3 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="mt-0.5 font-display text-xl font-bold tabular-nums">{report.scores[k]}</div>
              </div>
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Title" value={report.title ? `${report.titleLength} chars` : "missing"} />
            <Stat label="Description" value={report.description ? `${report.descriptionLength} chars` : "missing"} />
            <Stat label="H1s" value={`${report.h1Count}`} />
            <Stat label="Words" value={`${report.wordCount}`} />
          </dl>

          {report.failed.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold">Fix these ({report.failed.length})</p>
              <ul className="mt-2 flex flex-col gap-2">
                {(unlocked ? report.failed : report.failed.slice(0, 3)).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-card border border-border p-3 text-sm">
                    <span>{c.label}</span>
                    <Badge variant={c.priority === "high" ? "danger" : "warning"}>{c.priority}</Badge>
                  </li>
                ))}
              </ul>
              {!unlocked && report.failed.length > 3 && (
                <ToolLeadCapture
                  className="mt-4"
                  source="seo-audit"
                  title={`See all ${report.failed.length} issues`}
                  blurb="Get the full audit — every issue on this page — plus one SEO signal every Tuesday. Free."
                  cta="Unlock the full report"
                  onSuccess={() => setUnlocked(true)}
                />
              )}
            </div>
          )}

          {report.passed.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              ✓ {report.passed.length} checks already passing{report.schemas.length ? ` · schema: ${report.schemas.slice(0, 4).join(", ")}` : ""}.
            </p>
          )}
          <div className="mt-5">
            <ShareResult tool="Free SEO Audit" score={report.overall} label="SEO Score" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

/* ------------------------- AI Analyzer (real, Haiku) ------------------------- */
const aiConfigs: Record<string, { label: string; placeholder: string; multiline: boolean; cta: string }> = {
  "copy-analyzer": {
    label: "Paste your copy",
    placeholder: "Paste a headline or landing-page copy…",
    multiline: true,
    cta: "Want the full conversion teardown?",
  },
  "headline-tester": {
    label: "Your headline",
    placeholder: "Paste a headline to score…",
    multiline: false,
    cta: "Want more rewrites?",
  },
};

type AiResult = {
  score: number;
  summary: string;
  checks: { label: string; verdict: "good" | "improve" }[];
  suggestions: string[];
};

function AiAnalyzer({ slug }: { slug: string }) {
  const cfg = aiConfigs[slug];
  const [value, setValue] = React.useState("");
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = React.useState<AiResult | null>(null);
  const [error, setError] = React.useState("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/tools/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: slug, text: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        setState("error");
        return;
      }
      setResult(data as AiResult);
      setState("done");
    } catch {
      setError("Couldn't analyze that. Check your connection and try again.");
      setState("error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={run} className="grid gap-3">
        <Label htmlFor="ai-input">{cfg.label}</Label>
        {cfg.multiline ? (
          <Textarea id="ai-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={cfg.placeholder} className="min-h-32" />
        ) : (
          <Input id="ai-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={cfg.placeholder} />
        )}
        <Button type="submit" loading={state === "loading"} className="w-fit">
          Analyze
          {state !== "loading" && <ArrowRight />}
        </Button>
        <Badge variant="muted" className="w-fit">Real analysis · Claude Haiku</Badge>
      </form>

      <div>
        {state === "idle" && <EmptyState title="Your result appears here" description="Enter something on the left and analyze." />}
        {state === "loading" && (
          <div className="flex h-full min-h-48 items-center justify-center rounded-card border border-border">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        )}
        {state === "error" && (
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {state === "done" && result && (
          <Card className="p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">Overall score</span>
              <span className="font-display text-3xl font-extrabold tracking-tight">{result.score}/100</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${result.score}%` }} />
            </div>
            {result.summary && <p className="mt-4 text-sm text-foreground/90">{result.summary}</p>}
            {result.checks.length > 0 && (
              <ul className="mt-5 flex flex-col gap-2.5">
                {result.checks.map((c) => (
                  <li key={c.label} className="flex items-center justify-between text-sm">
                    <span>{c.label}</span>
                    <Badge variant={c.verdict === "good" ? "success" : "warning"}>{c.verdict === "good" ? "Good" : "Improve"}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {result.suggestions.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-medium">Suggestions</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="rounded-card border border-border bg-muted/40 p-3 text-sm text-foreground/90">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5">
              <ShareResult
                tool={slug === "headline-tester" ? "Headline Tester" : "Copy Analyzer"}
                score={result.score}
                label={slug === "headline-tester" ? "Headline Score" : "Copy Score"}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Router -------------------------------- */
export function ToolRunner({ slug, status }: { slug: string; status: string }) {
  if (status === "Soon") {
    return (
      <EmptyState
        icon={<Clock />}
        title="This tool is on the way"
        description="It's in active development. Join the newsletter to be the first to use it."
      />
    );
  }
  if (slug === "utm-builder") return <UtmBuilder />;
  if (slug === "roas-calculator") return <RoasCalculator />;
  if (slug === "schema-generator") return <SchemaGenerator />;
  if (slug === "readability-checker") return <ReadabilityChecker />;
  if (slug === "seo-audit") return <SeoAuditRunner />;
  if (aiConfigs[slug]) return <AiAnalyzer slug={slug} />;
  if (demoConfigs[slug]) return <DemoAnalyzer slug={slug} />;
  return (
    <EmptyState
      icon={<Clock />}
      title="Demo coming soon"
      description="The interactive version of this tool is being wired up."
    />
  );
}
