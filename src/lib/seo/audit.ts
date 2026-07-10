import type { AuditResult, AuditSummary, IssueCount, PageAuditEntry, ScoreColor } from "./types";
import { discoverPages } from "./discovery";
import { analyzePage } from "./analyzer";
import { scorePage } from "./scoring";
import { getOrigin, mapWithConcurrency } from "./fetch-html";
import { getPublishedPosts } from "@/lib/blog/queries";

const FETCH_CONCURRENCY = 6;

/** A page that was fetched and parsed. Narrowed so the summary can read it. */
type ScoredPage = PageAuditEntry & {
  analysis: NonNullable<PageAuditEntry["analysis"]>;
  scores: NonNullable<PageAuditEntry["scores"]>;
};

function isScored(page: PageAuditEntry): page is ScoredPage {
  return page.analysis !== null && page.scores !== null;
}

/** Exported for unit testing: pure, and the null-handling below is worth pinning. */
export function buildSummary(pages: PageAuditEntry[]): AuditSummary {
  const publicPages = pages.filter((p) => !p.entry.isPrivate);
  const scored = publicPages.filter(isScored);
  const unreachablePages = publicPages.length - scored.length;

  const indexed = scored.filter((p) => p.analysis.robotsIndex && p.entry.inSitemap);
  const notIndexed = scored.filter((p) => !p.analysis.robotsIndex || !p.entry.inSitemap);
  const missingMetadata = scored.filter((p) => !p.analysis.title || !p.analysis.description);
  const missingSchema = scored.filter((p) => p.analysis.schemas.length === 0);
  const missingOgImage = scored.filter((p) => p.analysis.ogImageSource !== "dedicated");

  const avg = (pick: (p: ScoredPage) => number) =>
    scored.length > 0 ? Math.round(scored.reduce((sum, p) => sum + pick(p), 0) / scored.length) : 0;

  const issueCounts = new Map<string, IssueCount>();
  for (const page of scored) {
    for (const check of page.scores.checks) {
      // A check that did not apply is neither passed nor failed — it is not an issue.
      if (check.applicable && !check.passed) {
        const existing = issueCounts.get(check.id);
        if (existing) existing.count++;
        else issueCounts.set(check.id, { id: check.id, label: check.label, category: check.category, count: 1 });
      }
    }
  }
  const issuesByType = [...issueCounts.values()].sort((a, b) => b.count - a.count);

  const colorDistribution: Record<ScoreColor, number> = { red: 0, orange: 0, yellow: 0, green: 0 };
  for (const page of scored) {
    colorDistribution[page.scores.color]++;
  }

  return {
    totalPages: publicPages.length,
    indexedPages: indexed.length,
    notIndexedPages: notIndexed.length,
    missingMetadata: missingMetadata.length,
    missingSchema: missingSchema.length,
    missingOgImage: missingOgImage.length,
    unreachablePages,
    avgSeoScore: avg((p) => p.scores.seo.score),
    avgGeoScore: avg((p) => p.scores.geo.score),
    avgAeoScore: avg((p) => p.scores.aeo.score),
    issuesByType,
    colorDistribution,
  };
}

export async function runFullAudit(): Promise<AuditResult> {
  // Public pages only. /admin/* self-fetches are cookieless, so requireAdmin()
  // redirects to /login and fetch follows it, parsing the login page as that
  // route's analysis — junk that buildSummary and the page discard anyway.
  // Dropping them here saves ~36 fetches and closes the /admin/seo/pages
  // self-fetch recursion path (today only the auth redirect prevents it).
  // buildSummary and the page still re-filter defensively.
  const entries = (await discoverPages(await getPublishedPosts())).filter((e) => !e.isPrivate);
  const origin = await getOrigin();

  const pages = await mapWithConcurrency(entries, FETCH_CONCURRENCY, async (entry) => {
    const analysis = await analyzePage(entry, origin);
    return {
      entry,
      analysis,
      scores: analysis ? scorePage(entry, analysis) : null,
    } satisfies PageAuditEntry;
  });

  return { pages, summary: buildSummary(pages) };
}

export async function auditSinglePage(route: string): Promise<PageAuditEntry | null> {
  const entries = await discoverPages(await getPublishedPosts());
  const entry = entries.find((e) => e.route === route);
  if (!entry) return null;
  const origin = await getOrigin();
  const analysis = await analyzePage(entry, origin);
  return { entry, analysis, scores: analysis ? scorePage(entry, analysis) : null };
}
