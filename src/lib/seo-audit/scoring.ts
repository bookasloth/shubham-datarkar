// Transparent, deterministic scoring model (spec §7, §23). Every check is a
// declared spec with an explicit weight; category scores are weighted means of
// check ratios in [0,1], and the two headline scores are weighted means of
// their categories. No randomness, no LLM — the same site always scores the
// same. The LLM pass (post-email) adds depth via findings, never touches these
// numbers.
import { scoreColor } from "@/lib/seo/constants";
import type { PageSignals } from "./signals";
import { detectTrust } from "./trust";
import { aiCrawlerAccess, robotsAllows, type RobotsInfo } from "./robots";
import type { AuditScores, CategoryScore, Check, Finding, PageClass, Severity } from "./types";

export type ScoringContext = {
  pages: PageSignals[]; // all attempted pages (ok and unreachable)
  robots: RobotsInfo;
  sitemapUrls: string[]; // normalized <loc> set from the sitemap(s)
  faviconPresent: boolean;
  linkCheck?: { checked: number; broken: number; brokenUrls: string[] };
};

const WORD_MIN: Record<PageClass, number> = {
  home: 150, service: 300, product: 250, category: 150, location: 200,
  about: 150, contact: 80, author: 120, article: 500, other: 120,
};

const FINDING_THRESHOLD = 0.8; // a check below this and with copy becomes a finding

// ---- helpers ---------------------------------------------------------------

function normUrl(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    x.search = "";
    if (x.pathname.length > 1) x.pathname = x.pathname.replace(/\/+$/, "");
    return x.toString();
  } catch {
    return u;
  }
}
function pathOf(u: string): string {
  try {
    return new URL(u).pathname || "/";
  } catch {
    return "/";
  }
}
const REL = ["Organization", "LocalBusiness", "Service", "Product", "Article", "BlogPosting", "ProfilePage", "Person"];
const COMMERCIAL: PageClass[] = ["service", "product"];
const CONTENTFUL: PageClass[] = ["home", "service", "product", "article", "category"];

// ---- check spec model ------------------------------------------------------

type Spec = {
  id: string;
  label: string;
  weight: number;
  cat: string; // category key
  finding?: { title: string; why: string; recommendation: string; severity: Severity };
} & (
  | { site: (ctx: ScoringContext) => number; siteFailing?: (ctx: ScoringContext) => string[] }
  | { applies?: (p: PageSignals, ctx: ScoringContext) => boolean; pass?: (p: PageSignals, ctx: ScoringContext) => boolean; score?: (p: PageSignals, ctx: ScoringContext) => number }
);

type EvaluatedCheck = { spec: Spec; ratio: number; applicable: boolean; failing: string[]; total: number };

function evaluate(spec: Spec, ctx: ScoringContext): EvaluatedCheck {
  if ("site" in spec && typeof spec.site === "function") {
    const ratio = clamp01(spec.site(ctx));
    return { spec, ratio, applicable: true, failing: spec.siteFailing?.(ctx) ?? [], total: 1 };
  }
  const s = spec as Extract<Spec, { applies?: unknown }>;
  const ok = ctx.pages.filter((p) => p.ok);
  const applicablePages = ok.filter((p) => (s.applies ? s.applies(p, ctx) : true));
  if (applicablePages.length === 0) return { spec, ratio: 0, applicable: false, failing: [], total: 0 };

  if (s.score) {
    const mean = applicablePages.reduce((sum, p) => sum + clamp01(s.score!(p, ctx)), 0) / applicablePages.length;
    const failing = applicablePages.filter((p) => clamp01(s.score!(p, ctx)) < 0.8).map((p) => p.url);
    return { spec, ratio: mean, applicable: true, failing, total: applicablePages.length };
  }
  const passing = applicablePages.filter((p) => s.pass!(p, ctx));
  const failing = applicablePages.filter((p) => !s.pass!(p, ctx)).map((p) => p.url);
  return { spec, ratio: passing.length / applicablePages.length, applicable: true, failing, total: applicablePages.length };
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

// ---- category tables -------------------------------------------------------

const SEO_CATS = [
  { key: "indexability", label: "Indexability", weight: 22 },
  { key: "technical", label: "Technical health", weight: 15 },
  { key: "metadata", label: "Metadata", weight: 15 },
  { key: "headings", label: "Headings", weight: 10 },
  { key: "schema", label: "Structured data", weight: 10 },
  { key: "content", label: "Content", weight: 12 },
  { key: "linking", label: "Internal linking", weight: 10 },
  { key: "media", label: "Media & social", weight: 6 },
] as const;

const AI_CATS = [
  { key: "readability", label: "Machine readability & access", weight: 18 },
  { key: "entities", label: "Structured info & entities", weight: 20 },
  { key: "clarity", label: "Entity clarity", weight: 12 },
  { key: "trust", label: "Trust & E-E-A-T signals", weight: 22 },
  { key: "breadth", label: "Topical breadth", weight: 16 },
  { key: "answers", label: "Answer structure", weight: 12 },
] as const;

// duplicate-group ratio over a keyed value; failing = members of groups of size > 1.
function dupRatio<T>(items: T[], key: (t: T) => string, urlOf: (t: T) => string) {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(it);
  }
  const dups = [...groups.values()].filter((g) => g.length > 1).flat();
  const denom = items.filter((it) => key(it)).length;
  return { ratio: denom ? 1 - dups.length / denom : 1, failing: dups.map(urlOf) };
}

const SEO_SPECS: Spec[] = [
  // Indexability (22)
  { id: "status-200", label: "Returns HTTP 200", weight: 3, cat: "indexability", applies: () => true, pass: (p) => p.ok && p.status === 200,
    finding: { title: "Pages return errors or redirects", why: "A page that does not return 200 cannot be indexed or ranked.", recommendation: "Ensure every important URL returns a 200 status directly.", severity: "critical" } },
  { id: "indexable", label: "Allows indexing (no noindex)", weight: 3, cat: "indexability", pass: (p) => p.robotsIndex,
    finding: { title: "Pages are blocked from indexing", why: "A noindex directive removes the page from search results entirely.", recommendation: "Remove noindex from pages that should rank.", severity: "critical" } },
  { id: "robots-allowed", label: "Crawlable in robots.txt", weight: 2, cat: "indexability", pass: (p, c) => robotsAllows(c.robots, pathOf(p.url)),
    finding: { title: "robots.txt blocks important pages", why: "Disallowed pages are never crawled, so they cannot be indexed.", recommendation: "Loosen robots.txt so key pages are crawlable.", severity: "high" } },
  { id: "canonical-self", label: "Has a self-referencing canonical", weight: 2, cat: "indexability", pass: (p) => !!p.canonical && p.canonicalSelf,
    finding: { title: "Missing or mismatched canonical tags", why: "A missing or wrong canonical can split ranking signals or deindex the page.", recommendation: "Add a self-referencing canonical to each indexable page.", severity: "medium" } },
  { id: "in-sitemap", label: "Listed in sitemap.xml", weight: 2, cat: "indexability", pass: (p, c) => c.sitemapUrls.includes(normUrl(p.url)),
    finding: { title: "Pages are not in the sitemap", why: "A sitemap helps search engines discover and prioritise pages.", recommendation: "Add all important URLs to sitemap.xml and submit it to Search Console.", severity: "medium" } },

  // Technical health (15)
  { id: "https", label: "Served over HTTPS", weight: 3, cat: "technical", applies: () => true, pass: (p) => p.https,
    finding: { title: "Not served over HTTPS", why: "HTTPS is a baseline trust and ranking signal; browsers warn on HTTP.", recommendation: "Serve the whole site over HTTPS and redirect HTTP to it.", severity: "high" } },
  { id: "no-redirect-chain", label: "No redirect chains", weight: 2, cat: "technical", pass: (p) => p.redirectHops <= 1,
    finding: { title: "Pages sit behind redirect chains", why: "Extra hops waste crawl budget and slow the page.", recommendation: "Point internal links straight at the final URL.", severity: "low" } },
  { id: "no-broken-links", label: "No broken internal links", weight: 2, cat: "technical",
    site: (c) => (c.linkCheck && c.linkCheck.checked ? 1 - c.linkCheck.broken / c.linkCheck.checked : 1),
    siteFailing: (c) => c.linkCheck?.brokenUrls ?? [],
    finding: { title: "Broken internal links found", why: "Broken links waste crawl budget and hurt user trust.", recommendation: "Fix or remove links that return 4xx/5xx.", severity: "medium" } },

  // Metadata (15)
  { id: "has-title", label: "Has a title tag", weight: 3, cat: "metadata", pass: (p) => !!p.title,
    finding: { title: "Missing title tags", why: "The title is the primary on-page ranking and click signal.", recommendation: "Write a unique, descriptive title for every page.", severity: "high" } },
  { id: "title-length", label: "Title length 30–60 chars", weight: 2, cat: "metadata", applies: (p) => !!p.title, pass: (p) => p.titleLength >= 30 && p.titleLength <= 60,
    finding: { title: "Titles are too short or too long", why: "Titles outside ~30–60 chars get truncated or look thin in results.", recommendation: "Tighten titles to roughly 50–60 characters.", severity: "low" } },
  { id: "has-desc", label: "Has a meta description", weight: 3, cat: "metadata", pass: (p) => !!p.description,
    finding: { title: "Missing meta descriptions", why: "The description shapes the search snippet and click-through.", recommendation: "Add a compelling 120–160 char description to each page.", severity: "medium" } },
  { id: "desc-length", label: "Description length 120–160", weight: 2, cat: "metadata", applies: (p) => !!p.description, pass: (p) => p.descriptionLength >= 120 && p.descriptionLength <= 160,
    finding: { title: "Meta descriptions are off-length", why: "Descriptions outside ~120–160 chars get truncated or under-use the snippet.", recommendation: "Rewrite descriptions to ~150 characters.", severity: "low" } },
  { id: "unique-titles", label: "Titles are unique", weight: 2, cat: "metadata",
    site: (c) => dupRatio(c.pages.filter((p) => p.ok && p.title), (p) => p.title!.toLowerCase(), (p) => p.url).ratio,
    siteFailing: (c) => dupRatio(c.pages.filter((p) => p.ok && p.title), (p) => p.title!.toLowerCase(), (p) => p.url).failing,
    finding: { title: "Duplicate title tags", why: "Duplicate titles compete with each other and confuse relevance.", recommendation: "Give each page a distinct title.", severity: "medium" } },
  { id: "unique-descs", label: "Descriptions are unique", weight: 1, cat: "metadata",
    site: (c) => dupRatio(c.pages.filter((p) => p.ok && p.description), (p) => p.description!.toLowerCase(), (p) => p.url).ratio,
    siteFailing: (c) => dupRatio(c.pages.filter((p) => p.ok && p.description), (p) => p.description!.toLowerCase(), (p) => p.url).failing,
    finding: { title: "Duplicate meta descriptions", why: "Duplicate descriptions waste the snippet and signal thin differentiation.", recommendation: "Write a unique description per page.", severity: "low" } },

  // Headings (10)
  { id: "single-h1", label: "Exactly one H1", weight: 3, cat: "headings", pass: (p) => p.h1Count === 1,
    finding: { title: "Pages have zero or multiple H1s", why: "One clear H1 states the page's main topic to engines and readers.", recommendation: "Use exactly one H1 per page.", severity: "medium" } },
  { id: "has-h2", label: "Has H2 subheadings", weight: 2, cat: "headings", applies: (p) => CONTENTFUL.includes(p.class), pass: (p) => p.h2Count >= 1,
    finding: { title: "Content pages lack subheadings", why: "H2s give structure that both readers and extractors rely on.", recommendation: "Break content into H2-led sections.", severity: "low" } },
  { id: "no-skipped-heading", label: "No skipped heading levels", weight: 1, cat: "headings", pass: (p) => !p.skippedHeadingLevel,
    finding: { title: "Heading levels are skipped", why: "A clean hierarchy helps accessibility and machine parsing.", recommendation: "Don't jump from H1 to H3 — keep the order.", severity: "low" } },

  // Structured data (10)
  { id: "has-schema", label: "Has JSON-LD structured data", weight: 3, cat: "schema", pass: (p) => p.schemas.length > 0,
    finding: { title: "No structured data", why: "Schema helps machines understand the page and can enable rich results (when it matches visible content).", recommendation: "Add JSON-LD that matches the page's visible content.", severity: "medium" } },
  { id: "valid-schema", label: "Structured data parses", weight: 2, cat: "schema", applies: (p) => p.schemas.length > 0 || p.schemaParseErrors > 0, pass: (p) => p.schemaParseErrors === 0,
    finding: { title: "Structured data has syntax errors", why: "Invalid JSON-LD is ignored, wasting the markup.", recommendation: "Validate JSON-LD and fix parse errors.", severity: "medium" } },
  { id: "relevant-schema", label: "Schema type matches the page", weight: 2, cat: "schema", applies: (p) => p.class === "home" || COMMERCIAL.includes(p.class), pass: (p) => p.schemas.some((s) => REL.includes(s)),
    finding: { title: "Key pages lack relevant schema", why: "Entity schema (Organization/Service/Product) clarifies what the page is about.", recommendation: "Add the schema type that matches each key page.", severity: "medium" } },

  // Content (12)
  { id: "not-thin", label: "Enough content for the page type", weight: 3, cat: "content", pass: (p) => p.wordCount >= WORD_MIN[p.class],
    finding: { title: "Thin content on important pages", why: "Pages below a useful word count rarely satisfy intent or rank.", recommendation: "Expand thin pages with genuinely useful detail.", severity: "medium" } },
  { id: "not-duplicate", label: "No duplicate page content", weight: 2, cat: "content",
    site: (c) => dupRatio(c.pages.filter((p) => p.ok && p.bodyFingerprint), (p) => p.bodyFingerprint, (p) => p.url).ratio,
    siteFailing: (c) => dupRatio(c.pages.filter((p) => p.ok && p.bodyFingerprint), (p) => p.bodyFingerprint, (p) => p.url).failing,
    finding: { title: "Duplicate content across pages", why: "Near-identical pages split ranking signals and look low-effort.", recommendation: "Consolidate or differentiate duplicate pages.", severity: "medium" } },

  // Internal linking (10)
  { id: "not-orphan", label: "Reachable from other pages", weight: 3, cat: "linking", applies: (p) => p.class !== "home", pass: (p, c) => c.pages.some((o) => o.url !== p.url && o.internalLinks.map(normUrl).includes(normUrl(p.url))),
    finding: { title: "Orphan pages with no internal links", why: "Orphans get little crawl attention and pass no internal authority.", recommendation: "Link orphan pages from relevant hubs with descriptive anchors.", severity: "medium" } },
  { id: "commercial-linked", label: "Commercial pages well linked", weight: 2, cat: "linking", applies: (p) => COMMERCIAL.includes(p.class), pass: (p, c) => c.pages.filter((o) => o.url !== p.url && o.internalLinks.map(normUrl).includes(normUrl(p.url))).length >= 2,
    finding: { title: "Money pages receive little internal linking", why: "Your most valuable pages need internal authority to rank.", recommendation: "Link service/product pages from supporting content with contextual anchors.", severity: "high" } },
  { id: "home-links-out", label: "Homepage links into the site", weight: 1, cat: "linking", applies: (p) => p.class === "home", pass: (p) => p.internalLinks.length >= 3,
    finding: { title: "Homepage links to few internal pages", why: "The homepage distributes the most authority; use it.", recommendation: "Link the homepage to your key sections.", severity: "low" } },

  // Media & social (6)
  { id: "alt-coverage", label: "Images have alt text", weight: 2, cat: "media", applies: (p) => p.imageCount > 0, score: (p) => p.imagesWithAlt / p.imageCount,
    finding: { title: "Images missing alt text", why: "Alt text aids accessibility and image search.", recommendation: "Add descriptive alt text to meaningful images.", severity: "low" } },
  { id: "og-tags", label: "Has Open Graph title + image", weight: 2, cat: "media", pass: (p) => p.hasOgTitle && p.hasOgImage,
    finding: { title: "Missing social share metadata", why: "Open Graph controls how links look when shared.", recommendation: "Add og:title and og:image to each page.", severity: "low" } },
  { id: "favicon", label: "Has a favicon", weight: 1, cat: "media", site: (c) => (c.faviconPresent ? 1 : 0),
    finding: { title: "No favicon", why: "A favicon is a small but expected trust cue.", recommendation: "Add a favicon.", severity: "low" } },
];

const AI_SPECS: Spec[] = [
  // Machine readability & access (18)
  { id: "extractable", label: "Content is cleanly extractable", weight: 3, cat: "readability", pass: (p) => p.extractOk,
    finding: { title: "Content is hard for machines to extract", why: "If a reader-mode parser can't find the article body, neither can an AI system reliably.", recommendation: "Render real content in HTML (not JS-only) inside semantic <main>/<article>.", severity: "high" } },
  { id: "low-junk", label: "Low boilerplate ratio", weight: 2, cat: "readability", pass: (p) => p.junkRatio <= 0.4,
    finding: { title: "Pages are mostly navigation/boilerplate", why: "A high chrome-to-content ratio buries the answer.", recommendation: "Increase the share of substantive content per page.", severity: "low" } },
  { id: "content-in-html", label: "Content present in HTML", weight: 2, cat: "readability", applies: (p) => CONTENTFUL.includes(p.class), pass: (p) => p.wordCount >= 100,
    finding: { title: "Little text in the served HTML", why: "AI crawlers largely read server-rendered HTML; JS-only content may be invisible to them.", recommendation: "Server-render the key content.", severity: "high" } },
  { id: "ai-crawlers", label: "Major AI crawlers allowed", weight: 2, cat: "readability",
    site: (c) => { const a = aiCrawlerAccess(c.robots); return a.filter((x) => x.allowed).length / a.length; },
    siteFailing: (c) => aiCrawlerAccess(c.robots).filter((x) => !x.allowed).map((x) => x.name),
    finding: { title: "robots.txt blocks AI crawlers", why: "Blocked crawlers cannot read your content to cite it — this is a readiness signal, not a guarantee of citation.", recommendation: "Decide deliberately which AI crawlers to allow; blocking them removes any chance of being read.", severity: "medium" } },

  // Structured info & entities (20)
  { id: "org-schema", label: "Organization/Person entity schema", weight: 3, cat: "entities", site: (c) => (c.pages.some((p) => p.schemas.some((s) => ["Organization", "LocalBusiness", "Person"].includes(s))) ? 1 : 0),
    finding: { title: "No organisation or person entity markup", why: "Entity schema tells machines who you are and links you to a knowledge graph.", recommendation: "Add Organization (or Person/LocalBusiness) schema on the homepage.", severity: "high" } },
  { id: "commercial-entity", label: "Service/Product schema on key pages", weight: 2, cat: "entities", applies: (p) => COMMERCIAL.includes(p.class), pass: (p) => p.schemas.some((s) => ["Service", "Product", "Offer"].includes(s)),
    finding: { title: "Commercial pages lack Service/Product schema", why: "This schema clarifies what you sell and to whom.", recommendation: "Add Service or Product schema to commercial pages, matching visible content.", severity: "medium" } },
  { id: "same-as", label: "Entity linked with sameAs", weight: 1, cat: "entities", site: (c) => (c.pages.some((p) => p.hasSameAs) ? 1 : 0),
    finding: { title: "No sameAs entity links", why: "sameAs links (to social/wiki profiles) help disambiguate your entity.", recommendation: "Add sameAs to your Organization/Person schema.", severity: "low" } },
  { id: "breadcrumbs", label: "Breadcrumb markup on inner pages", weight: 1, cat: "entities", applies: (p) => p.class !== "home", pass: (p) => p.schemas.includes("BreadcrumbList"),
    finding: { title: "No breadcrumb markup", why: "Breadcrumbs express site structure and page relationships.", recommendation: "Add BreadcrumbList schema to inner pages.", severity: "low" } },

  // Entity clarity (12)
  { id: "home-clarity", label: "Homepage states who/what clearly", weight: 2, cat: "clarity", applies: (p) => p.class === "home", score: (p) => ([!!p.title, !!p.description, p.h1Count >= 1].filter(Boolean).length) / 3,
    finding: { title: "Homepage identity is unclear", why: "If the homepage doesn't state who you are and what you do, machines can't summarise you.", recommendation: "Make the H1 + intro state clearly what you offer and to whom.", severity: "high" } },
  { id: "name-consistency", label: "Consistent brand identity", weight: 1, cat: "clarity", site: (c) => { const home = c.pages.find((p) => p.class === "home"); return home?.title && c.pages.some((p) => p.schemas.some((s) => ["Organization", "LocalBusiness", "Person"].includes(s))) ? 1 : home?.title ? 0.5 : 0; },
    finding: { title: "Weak entity consistency", why: "A consistent name across title + schema strengthens your entity.", recommendation: "Match your brand name across titles and Organization schema.", severity: "low" } },

  // Trust & E-E-A-T (22)
  { id: "trust-about", label: "Has an About page", weight: 2, cat: "trust", site: (c) => (detectTrust(c.pages.filter((p) => p.ok)).hasAbout ? 1 : 0),
    finding: { title: "No About page", why: "An About page is a core experience/authority signal.", recommendation: "Publish an About page covering who you are and your track record.", severity: "medium" } },
  { id: "trust-contact", label: "Contact info present", weight: 2, cat: "trust", site: (c) => { const t = detectTrust(c.pages.filter((p) => p.ok)); return t.hasContactPage || t.hasContactDetails ? 1 : 0; },
    finding: { title: "No clear contact information", why: "Contact details are a baseline trust and legitimacy signal.", recommendation: "Add a contact page with phone/email and, if local, address.", severity: "medium" } },
  { id: "trust-org", label: "Organisation identity", weight: 2, cat: "trust", site: (c) => (detectTrust(c.pages.filter((p) => p.ok)).hasOrganizationSchema ? 1 : 0) },
  { id: "trust-author", label: "Author/person identity", weight: 1, cat: "trust", site: (c) => (detectTrust(c.pages.filter((p) => p.ok)).hasPersonSchema ? 1 : 0),
    finding: { title: "No author or person identity", why: "First-hand expertise signals (named authors) support E-E-A-T.", recommendation: "Attribute content to real, credentialed authors.", severity: "low" } },
  { id: "trust-social-proof", label: "Testimonials or case studies", weight: 2, cat: "trust", site: (c) => (detectTrust(c.pages.filter((p) => p.ok)).hasTestimonials ? 1 : 0),
    finding: { title: "No visible social proof", why: "Testimonials, reviews and case studies are strong trust evidence.", recommendation: "Add genuine testimonials or case studies with specifics.", severity: "medium" } },
  { id: "trust-freshness", label: "Content shows dates", weight: 1, cat: "trust", site: (c) => (detectTrust(c.pages.filter((p) => p.ok)).hasDatedContent ? 1 : 0),
    finding: { title: "Content has no freshness signals", why: "Published/updated dates help judge recency.", recommendation: "Show published and updated dates on content.", severity: "low" } },

  // Topical breadth (16)
  { id: "multi-topic", label: "Covers multiple topics", weight: 2, cat: "breadth", site: (c) => { const classes = new Set(c.pages.filter((p) => p.ok && p.class !== "home").map((p) => p.class)); return Math.min(1, classes.size / 3); },
    finding: { title: "Narrow topical footprint", why: "Thin topical coverage limits the range of questions you can answer.", recommendation: "Build out supporting pages around your core topics.", severity: "medium" } },
  { id: "supporting-content", label: "Commercial + informational mix", weight: 2, cat: "breadth", site: (c) => { const ok = c.pages.filter((p) => p.ok); const comm = ok.some((p) => COMMERCIAL.includes(p.class)); const info = ok.some((p) => p.class === "article"); return comm && info ? 1 : comm || info ? 0.5 : 0; },
    finding: { title: "Missing supporting content", why: "Commercial pages need informational content around them to answer buyer questions.", recommendation: "Add guides/FAQs that support your commercial pages.", severity: "medium" } },
  { id: "not-single-page", label: "More than a single page", weight: 1, cat: "breadth", site: (c) => Math.min(1, c.pages.filter((p) => p.ok).length / 3) },

  // Answer structure (12)
  { id: "question-headings", label: "Uses question-style headings", weight: 2, cat: "answers", applies: (p) => CONTENTFUL.includes(p.class), pass: (p) => p.questionHeadings >= 1,
    finding: { title: "Pages don't address explicit questions", why: "Question-style headings map directly to how people (and AI) query.", recommendation: "Add headings phrased as the questions buyers actually ask, then answer them concisely.", severity: "medium" } },
  { id: "lists-tables", label: "Uses lists or tables", weight: 2, cat: "answers", applies: (p) => CONTENTFUL.includes(p.class), pass: (p) => p.listCount >= 1,
    finding: { title: "Little scannable/extractable structure", why: "Lists and tables are the easiest structures for machines to extract.", recommendation: "Present steps, options and comparisons as lists or tables.", severity: "low" } },
  { id: "heading-density", label: "Enough section headings", weight: 1, cat: "answers", applies: (p) => CONTENTFUL.includes(p.class), pass: (p) => p.h2Count >= 2,
    finding: { title: "Content lacks sectioning", why: "Sectioned content is easier to extract a self-contained answer from.", recommendation: "Split long content into clearly-headed sections.", severity: "low" } },
];

// ---- runner ----------------------------------------------------------------

function buildCategories(cats: readonly { key: string; label: string; weight: number }[], specs: Spec[], ctx: ScoringContext): { categories: CategoryScore[]; evaluated: EvaluatedCheck[] } {
  const evaluated = specs.map((s) => evaluate(s, ctx));
  const byCat = new Map<string, EvaluatedCheck[]>();
  for (const e of evaluated) (byCat.get(e.spec.cat) ?? byCat.set(e.spec.cat, []).get(e.spec.cat)!).push(e);

  const categories = cats.map((cat) => {
    const included = (byCat.get(cat.key) ?? []).filter((e) => e.applicable);
    const wsum = included.reduce((s, e) => s + e.spec.weight, 0);
    const score = wsum === 0 ? 100 : Math.round((included.reduce((s, e) => s + e.spec.weight * e.ratio, 0) / wsum) * 100);
    const checks: Check[] = included.map((e) => ({ id: e.spec.id, label: e.spec.label, ratio: e.ratio, weight: e.spec.weight, detail: e.total > 1 ? `${Math.round(e.ratio * e.total)}/${e.total} pages` : undefined }));
    return { key: cat.key, label: cat.label, weight: cat.weight, score, checks };
  });
  return { categories, evaluated };
}

function rollup(categories: CategoryScore[]): number {
  const wsum = categories.reduce((s, c) => s + c.weight, 0);
  return wsum === 0 ? 0 : Math.round(categories.reduce((s, c) => s + c.weight * c.score, 0) / wsum);
}

function toFindings(evaluated: EvaluatedCheck[], category: "seo" | "ai"): Finding[] {
  const out: Finding[] = [];
  for (const e of evaluated) {
    if (!e.applicable || !e.spec.finding || e.ratio >= FINDING_THRESHOLD) continue;
    const f = e.spec.finding;
    // Soften severity when the check is only partially failing.
    const severity = e.ratio >= 0.5 ? downgrade(f.severity) : f.severity;
    // A site-level check's `failing` can be non-URL labels (e.g. blocked AI
    // crawler names). Only real URLs belong in affectedUrls — labels go to the
    // evidence text, so the report UI never tries to parse a label as a URL.
    const urls = e.failing.filter((x) => /^https?:\/\//i.test(x));
    const labels = e.failing.filter((x) => !/^https?:\/\//i.test(x));
    const evidence =
      e.total > 1
        ? `${e.failing.length} of ${e.total} pages affected`
        : labels.length
          ? labels.slice(0, 8).join(", ")
          : "Site-wide";
    out.push({
      id: e.spec.id,
      title: f.title,
      problem: f.title,
      why: f.why,
      evidence,
      affectedUrls: urls.slice(0, 10),
      severity,
      category,
      recommendation: f.recommendation,
      source: "deterministic",
    });
  }
  return out;
}

const ORDER: Severity[] = ["critical", "high", "medium", "low"];
function downgrade(s: Severity): Severity {
  const i = ORDER.indexOf(s);
  return ORDER[Math.min(ORDER.length - 1, i + 1)];
}

/** Score a crawled site. Deterministic — pure function of the context. */
export function scoreAudit(ctx: ScoringContext): { scores: AuditScores; findings: Finding[] } {
  const seo = buildCategories(SEO_CATS, SEO_SPECS, ctx);
  const ai = buildCategories(AI_CATS, AI_SPECS, ctx);
  const seoScore = rollup(seo.categories);
  const aiScore = rollup(ai.categories);
  const overall = Math.round(seoScore * 0.5 + aiScore * 0.5);

  const findings = [...toFindings(seo.evaluated, "seo"), ...toFindings(ai.evaluated, "ai")].sort(
    (a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity),
  );

  return {
    scores: { seo: seoScore, ai: aiScore, overall, color: scoreColor(overall), seoCategories: seo.categories, aiCategories: ai.categories },
    findings,
  };
}
