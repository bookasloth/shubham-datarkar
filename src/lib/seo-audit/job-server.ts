import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { mapWithConcurrency } from "@/lib/seo/fetch-html";
import { safeFetchDetailed, safeFetchText, type DetailedFetch } from "@/lib/tools/safe-fetch";
import { discoverUrls, parseSitemap, isSitemapLoc, normalizeUrl } from "./discover";
import { extractSignals, type PageSignals } from "./signals";
import { parseRobotsInfo } from "./robots";
import { scoreAudit } from "./scoring";
import { logAuditEvent } from "./events-server";
import type { DiscoveredUrl } from "./types";

const BATCH = 6;
const CONCURRENCY = 6;
const STEP_LOCK_MS = 60_000; // reclaim a lock left by a crashed step (route maxDuration is 60s)

export type AuditDeps = {
  fetchPage: (url: string) => Promise<DetailedFetch>;
  fetchText: (url: string) => Promise<string | null>;
};

function defaultDeps(): AuditDeps {
  return { fetchPage: safeFetchDetailed, fetchText: safeFetchText };
}

export type CrawlMeta = { robotsTxt: string | null; sitemapUrls: string[]; faviconPresent: boolean };

export type AuditRow = {
  id: string;
  url: string;
  status: string;
  progress: number;
  page_budget: number;
  crawl_cursor: number;
  urls: DiscoveredUrl[];
  crawl_meta: CrawlMeta | null;
  pages: PageSignals[];
  created_at: string;
};

export type StepResult = { status: string; progress: number };
type Transition = { patch: Record<string, unknown>; result: StepResult };

/** Minimal signals for a page that could not be fetched (records the failure for scoring). */
function emptySignals(u: DiscoveredUrl, status: number, redirectHops: number): PageSignals {
  return {
    url: u.url, class: u.class, status, ok: false, redirectHops,
    https: u.url.startsWith("https:"),
    title: null, titleLength: 0, description: null, descriptionLength: 0,
    canonical: null, canonicalSelf: false, robotsIndex: true,
    hasOgTitle: false, hasOgImage: false, hasTwitterCard: false,
    schemas: [], schemaParseErrors: 0,
    h1Count: 0, h2Count: 0, h3Count: 0, skippedHeadingLevel: false,
    wordCount: 0, listCount: 0, imageCount: 0, imagesWithAlt: 0,
    internalLinks: [], externalLinkCount: 0,
    extractOk: false, junkRatio: 0, questionHeadings: 0, hasDates: false,
    hasTelLink: false, hasMailtoLink: false, mentionsTestimonials: false,
    hasSameAs: false, bodyFingerprint: "",
  };
}

// ---- transitions (pure over the row; I/O injected) -------------------------

/** queued → crawling: fetch homepage + robots + sitemap, build the crawl list, seed the homepage signals. */
export async function discoverStep(row: AuditRow, deps: AuditDeps): Promise<Transition> {
  const home = await deps.fetchPage(row.url);
  if (!home.body) throw new Error(`homepage unreachable (status ${home.status})`);
  const origin = new URL(home.finalUrl).origin;
  const base = new URL(home.finalUrl);

  const robotsTxt = await deps.fetchText(`${origin}/robots.txt`);
  const robots = parseRobotsInfo(robotsTxt);

  const sitemapSources = (robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`]).slice(0, 3);
  const locs: string[] = [];
  let nested = 0;
  for (const sm of sitemapSources) {
    const xml = await deps.fetchText(sm);
    if (!xml) continue;
    for (const loc of parseSitemap(xml)) {
      if (isSitemapLoc(loc)) {
        if (nested < 3) {
          nested++;
          const child = await deps.fetchText(loc);
          if (child) locs.push(...parseSitemap(child));
        }
      } else {
        locs.push(loc);
      }
    }
  }

  const urls = discoverUrls({ homeUrl: home.finalUrl, homeHtml: home.body, sitemapLocs: locs, budget: row.page_budget });
  const sitemapUrls = [...new Set(locs.map((l) => normalizeUrl(l, base)).filter((u): u is string => !!u))];

  const faviconPresent =
    /<link[^>]+rel=["'][^"']*icon/i.test(home.body) || (await deps.fetchPage(`${origin}/favicon.ico`).then((r) => r.status === 200).catch(() => false));

  // Seed the homepage signals now (avoids re-fetching it in the crawl loop).
  const homeUrl = urls[0];
  const homeSignals = extractSignals({
    url: home.finalUrl, class: "home", html: home.body,
    status: home.status, ok: home.status >= 200 && home.status < 300, redirectHops: home.redirectHops, xRobotsTag: home.xRobotsTag,
  });

  const meta: CrawlMeta = { robotsTxt, sitemapUrls, faviconPresent };
  return {
    patch: { status: "crawling", progress: 10, urls, crawl_meta: meta, pages: [homeSignals], crawl_cursor: homeUrl ? 1 : 0 },
    result: { status: "crawling", progress: 10 },
  };
}

/** crawling → crawling|scoring: fetch one batch and append signals. */
export async function crawlStep(row: AuditRow, deps: AuditDeps): Promise<Transition> {
  const urls = row.urls ?? [];
  const total = urls.length;
  const batch = urls.slice(row.crawl_cursor, row.crawl_cursor + BATCH);

  const signals = await mapWithConcurrency(batch, CONCURRENCY, async (u): Promise<PageSignals> => {
    try {
      const r = await deps.fetchPage(u.url);
      if (!r.body) return emptySignals(u, r.status, r.redirectHops);
      return extractSignals({
        url: r.finalUrl, class: u.class, html: r.body,
        status: r.status, ok: r.status >= 200 && r.status < 300, redirectHops: r.redirectHops, xRobotsTag: r.xRobotsTag,
      });
    } catch {
      return emptySignals(u, 0, 0);
    }
  });

  const pages = [...(row.pages ?? []), ...signals];
  const cursor = row.crawl_cursor + batch.length;
  const done = cursor >= total;
  const progress = 10 + Math.round((total ? cursor / total : 1) * 70);
  const status = done ? "scoring" : "crawling";
  return { patch: { pages, crawl_cursor: cursor, status, progress }, result: { status, progress } };
}

/** scoring → ready: deterministic scores + findings (pure). Free report ready here. */
export function scoreStep(row: AuditRow): Transition {
  const meta = row.crawl_meta ?? { robotsTxt: null, sitemapUrls: [], faviconPresent: false };
  const robots = parseRobotsInfo(meta.robotsTxt ?? null);
  const { scores, findings } = scoreAudit({
    pages: row.pages ?? [],
    robots,
    sitemapUrls: meta.sitemapUrls ?? [],
    faviconPresent: !!meta.faviconPresent,
  });
  const pageCount = (row.pages ?? []).filter((p) => p.ok).length;
  const crawlMs = Date.now() - new Date(row.created_at).getTime();
  return {
    patch: { status: "ready", progress: 100, scores, findings, page_count: pageCount, crawl_ms: crawlMs },
    result: { status: "ready", progress: 100 },
  };
}

// ---- runner (DB read + single-flight lock + persist) -----------------------

/** Advance one transition and persist it. The caller re-invokes until terminal (`ready`/`complete`/`failed`). */
export async function runAuditStep(id: string, deps: AuditDeps = defaultDeps()): Promise<StepResult> {
  const db = supabaseAdmin();
  const { data } = await db.from("seo_audits").select("*").eq("id", id).maybeSingle();
  const row = data as AuditRow | null;
  if (!row) throw new Error(`audit ${id} not found`);
  if (["ready", "complete", "failed"].includes(row.status)) return { status: row.status, progress: row.progress };

  // Single-flight: claim the row only if still at this status and unlocked (or stale).
  const staleBefore = new Date(Date.now() - STEP_LOCK_MS).toISOString();
  const { data: claimed } = await db
    .from("seo_audits")
    .update({ locked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", row.status)
    .or(`locked_at.is.null,locked_at.lt.${staleBefore}`)
    .select("id");
  if (!claimed?.length) return { status: row.status, progress: row.progress };

  try {
    let t: Transition;
    if (row.status === "queued") t = await discoverStep(row, deps);
    else if (row.status === "crawling") t = await crawlStep(row, deps);
    else if (row.status === "scoring") t = scoreStep(row);
    else return { status: row.status, progress: row.progress };

    await db.from("seo_audits").update({ ...t.patch, locked_at: null, updated_at: new Date().toISOString() }).eq("id", id);
    if (t.result.status === "ready") await logAuditEvent("audit_completed", id);
    return t.result;
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await db.from("seo_audits").update({ status: "failed", error: message, locked_at: null }).eq("id", id);
    await logAuditEvent("audit_failed", id, { at: row.status });
    return { status: "failed", progress: row.progress };
  }
}
