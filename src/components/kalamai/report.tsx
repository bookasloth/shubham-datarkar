import { TermChips } from "./term-chips";
import type { RankedTerm, Placement } from "@/lib/kalamai/terms";
import type { Brief } from "@/lib/kalamai/brief";

type Competitor = { url: string; rank: number; wordCount: number; h2Count: number; aiCited: boolean };

export type AnalysisReport = {
  terms: RankedTerm[];
  competitors: Competitor[];
  successes: number;
  total: number;
  brief: Brief;
};

const PLACEMENT_ORDER: Placement[] = ["h1", "h2h3", "meta", "body"];
const PLACEMENT_LABEL: Record<Placement, string> = {
  h1: "For the H1",
  h2h3: "For H2 / H3 headings",
  meta: "For the meta title & description",
  body: "For the body",
};

function prettyJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function KalamaiReport({ report, lowConfidence }: { report: AnalysisReport; lowConfidence: boolean }) {
  const b = report.brief;
  const groups = PLACEMENT_ORDER.map((p) => ({
    placement: p,
    terms: report.terms.filter((t) => t.placement === p).slice(0, 24),
  })).filter((g) => g.terms.length > 0);

  return (
    <div className="space-y-6">
      {lowConfidence && (
        <div className="rounded-card border border-warning/40 bg-warning/10 p-4 text-sm">
          <span className="font-medium">Low data confidence.</span> Only {report.successes} of {report.total} competitor
          pages could be read. Treat the recommendations as directional.
        </div>
      )}

      <Card title="Recommended terms">
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.placement}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">{PLACEMENT_LABEL[g.placement]}</h3>
              <TermChips terms={g.terms} />
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted-foreground">No terms extracted.</p>}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Meta title suggestions">
          <ul className="space-y-2 text-sm">
            {b.metaTitles.map((t, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <span>{t}</span>
                <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{t.length}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Meta description suggestions">
          <ul className="space-y-2 text-sm">
            {b.metaDescriptions.map((d, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <span>{d}</span>
                <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{d.length}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Suggested outline">
        <ol className="space-y-3 text-sm">
          {b.outline.map((s, i) => (
            <li key={i}>
              <span className="font-medium">{s.h2}</span>
              {s.h3.length > 0 && (
                <ul className="mt-1 ml-4 list-disc space-y-0.5 text-muted-foreground">
                  {s.h3.map((h, j) => (
                    <li key={j}>{h}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Questions to answer">
          <ul className="list-disc space-y-1.5 pl-4 text-sm">
            {b.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Card>
        <Card title="AEO / GEO insights">
          <ul className="list-disc space-y-1.5 pl-4 text-sm">
            {b.aeoInsights.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title={`Competitors (${report.successes} of ${report.total} read)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">URL</th>
                <th className="py-2 pr-3 font-medium tabular-nums">Words</th>
                <th className="py-2 pr-3 font-medium tabular-nums">H2s</th>
                <th className="py-2 font-medium">AI-cited</th>
              </tr>
            </thead>
            <tbody>
              {report.competitors.map((c) => (
                <tr key={c.url} className="border-b border-border/60">
                  <td className="py-2 pr-3 tabular-nums text-muted-foreground">{c.rank}</td>
                  <td className="max-w-[24rem] truncate py-2 pr-3">
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {c.url}
                    </a>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{c.wordCount.toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-3 tabular-nums">{c.h2Count}</td>
                  <td className="py-2">{c.aiCited ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`Recommended schema: ${b.schemaType}`}>
        <pre className="overflow-x-auto rounded-input border border-border bg-muted p-4 text-xs">
          <code>{prettyJson(b.schemaJsonLd)}</code>
        </pre>
      </Card>
    </div>
  );
}
