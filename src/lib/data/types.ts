/** Shared content types. Shapes mirror what a CMS (Sanity) would return. */

/**
 * Per-entity SEO copy. Every field is optional and falls back to the entity's
 * own name/description, so adding this block breaks nothing. PR 4 fills it in.
 */
export type SeoFields = {
  /** Keyword phrase, 15-40 chars, no brand name (the root template appends it). */
  title?: string;
  /** 120-160 chars. */
  description?: string;
  /** Social-card headline. Defaults to the branded full title. */
  ogTitle?: string;
  /** Social-card body. Defaults to `description`. */
  ogDescription?: string;
  /** Visible page heading, when it should differ from the entity name. */
  h1?: string;
};

export type IconName = string;

export type BlogCategory = "seo" | "ai" | "performance" | "content" | "saas" | "founder" | "build-in-public";

/* ------------------------------------------------------------------ */
/*  Inline rich text — serializable spans a CMS would emit.            */
/*  A RichText value is either a plain string or a list of spans.      */
/* ------------------------------------------------------------------ */
export type InlineNode =
  | string
  | { t: "b"; text: string } // bold
  | { t: "i"; text: string } // italic
  | { t: "u"; text: string } // underline
  | { t: "s"; text: string } // strikethrough
  | { t: "mark"; text: string } // highlighted
  | { t: "small"; text: string } // small text
  | { t: "code"; text: string } // inline code
  | { t: "kbd"; text: string } // keyboard key
  | { t: "sub"; text: string } // subscript
  | { t: "sup"; text: string } // superscript
  | { t: "a"; text: string; href: string } // hyperlink
  | { t: "tooltip"; text: string; tip: string } // inline tooltip
  | { t: "popover"; text: string; content: string } // inline popover
  | { t: "fn"; n: number }; // footnote reference

export type RichText = string | InlineNode[];

/** A list item may be plain rich text or carry a nested sub-list. */
export type ListItem = RichText | { text: RichText; items: RichText[] };

export type EditorialImage = {
  /** Monochrome SVG placeholder seed — no external assets needed. */
  seed: string;
  alt: string;
  caption?: RichText;
  /** Aspect ratio, e.g. "16/9" (default), "1/1", "4/3". */
  ratio?: string;
};

export type ContentBlock =
  /* — Typography — */
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "lead"; text: RichText }
  | { type: "p"; text: RichText }
  | { type: "small"; text: RichText }
  | { type: "caption"; text: RichText }
  /* — Lists — */
  | { type: "ul"; items: ListItem[] }
  | { type: "ol"; items: ListItem[] }
  | { type: "tasklist"; items: { text: RichText; done: boolean }[] }
  /* — Media — */
  | { type: "figure"; image: EditorialImage; featured?: boolean }
  | { type: "figures"; images: EditorialImage[] }
  | { type: "gallery"; images: EditorialImage[] }
  | { type: "video"; provider?: "youtube"; id: string; title: string; caption?: RichText }
  | { type: "audio"; title: string; subtitle?: string; duration?: number }
  /* — Quotes — */
  | { type: "quote"; text: RichText; cite?: string }
  | { type: "pullquote"; text: string; cite?: string }
  /* — Code — */
  | { type: "code"; code: string; lang?: string; filename?: string }
  /* — Tables — */
  | { type: "table"; columns: string[]; rows: RichText[][]; caption?: RichText }
  | { type: "comparisonTable"; columns: string[]; rows: { label: string; cells: (boolean | string)[] }[] }
  | { type: "pricing" }
  /* — Callouts — */
  | {
      type: "callout";
      variant?: "default" | "info" | "accent" | "note" | "tip" | "success" | "warning" | "error";
      title?: string;
      text: RichText;
    }
  /* — Interactive — */
  | { type: "faq"; items: { q: string; a: RichText }[] }
  | { type: "tabs"; items: { label: string; content: RichText }[] }
  | { type: "expand"; summary: string; content: RichText }
  /* — Embeds — */
  | { type: "socialEmbed"; author: string; handle: string; text: string; date: string }
  | { type: "map"; query: string; label: string }
  /* — Data & statistics — */
  | { type: "statCards"; stats: Stat[] }
  | { type: "metricsGrid"; metrics: { value: number; prefix?: string; suffix?: string; decimals?: number; label: string }[] }
  | { type: "progress"; label: string; value: number }
  | { type: "comparisonCards"; cards: { title: string; subtitle?: string; rows: { label: string; value: string }[]; highlight?: boolean }[] }
  /* — Utility — */
  | { type: "divider" }
  | { type: "spacer"; size?: "sm" | "md" | "lg" }
  | { type: "tags"; items: string[] }
  /* — Conversion — */
  | { type: "cta"; title: string; text: string; button: string; href: string }
  | { type: "newsletter"; title: string; text: string }
  | { type: "download"; title: string; description: string; meta: string; button?: string }
  | { type: "buttonGroup"; buttons: { label: string; href: string; variant?: "default" | "outline" | "secondary" | "ghost" }[] }
  /* — Knowledge — */
  | { type: "takeaways"; title?: string; items: RichText[] }
  | { type: "summary"; title?: string; text: RichText }
  | { type: "prosCons"; pros: string[]; cons: string[] }
  | { type: "steps"; items: { title: string; detail: RichText }[] }
  | { type: "timeline"; items: { marker: string; title: string; description?: string }[] }
  | { type: "references"; items: { label: string; href: string; source?: string }[] }
  | { type: "footnotes"; items: { n: number; text: RichText }[] }
  /* — Advanced — */
  | { type: "authorNote"; text: RichText }
  | { type: "expertInsight"; name: string; role: string; quote: RichText }
  | { type: "relatedCard"; slug: string }
  | { type: "resourceList"; items: { title: string; kind: string; href: string }[] }
  | { type: "quickFacts"; title?: string; facts: { label: string; value: string }[] };

export type Author = {
  name: string;
  role: string;
  initials: string;
};

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  tags: string[];
  date: string;
  /** Last edit time (DB `updated_at`). Drives visible freshness + schema `dateModified`. */
  dateModified?: string;
  words: number;
  featured?: boolean;
  body: ContentBlock[];
};

export type Project = {
  slug: string;
  name: string;
  summary: string;
  year: string;
  role: string;
  category: string;
  stack: string[];
  metric?: { value: string; label: string };
  link?: string;
};

export type CaseStudyMetric = { value: string; label: string };
export type KpiRow = { kpi: string; before: string; after: string; delta: string };

export type CaseStudy = {
  slug: string;
  client: string;
  sector: string;
  title: string;
  heroMetric: CaseStudyMetric;
  context: { industry: string; timeline: string; budget: string; services: string[] };
  problem: string;
  constraints: string[];
  strategy: string;
  execution: string[];
  results: KpiRow[];
  learnings: string;
  quote: { text: string; author: string; role: string };
  featured?: boolean;
  seo?: SeoFields;
};

export type Service = {
  slug: string;
  name: string;
  icon: IconName;
  tagline: string;
  outcome: string;
  description: string;
  deliverables: string[];
  process: { step: string; detail: string }[];
  startingAt: string;
  seo?: SeoFields;
};

export type ProductStatus = "Live" | "Beta" | "Building" | "Concept";

export type Product = {
  slug: string;
  name: string;
  /** Single brand accent color (hex). Used sparingly on the brand page. */
  color: string;
  tagline: string;
  about: string;
  category: string;
  status: ProductStatus;
  url?: string;
  seo?: SeoFields;
};

export type Platform = {
  name: string;
  blurb: string;
  description: string;
  category: string;
  url: string;
  /** Icon registry key (see @/lib/icons). */
  icon: string;
  /** Pastel background for the icon tile (hex). */
  accent: string;
};

export type Brand = { name: string };

export type ExperienceItem = {
  period: string;
  company: string;
  role: string;
  detail: string;
};

export type ToolStackItem = { name: string; note: string };

export type SampleIssue = { no: string; title: string; summary: string };

export type Tool = {
  slug: string;
  name: string;
  icon: IconName;
  category: string;
  description: string;
  status: "Live" | "Beta" | "Soon";
  uses?: number;
  seo?: SeoFields;
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
};

export type Faq = { question: string; answer: string; group: string };

export type ChangelogEntry = {
  date: string;
  version: string;
  title: string;
  type: "Added" | "Improved" | "Fixed" | "Shipped";
  notes: string[];
};

export type RoadmapItem = {
  title: string;
  description: string;
  status: "Shipped" | "In Progress" | "Planned" | "Exploring";
  quarter: string;
};

export type Resource = {
  slug: string;
  title: string;
  type: "Framework" | "Template" | "Guide" | "Checklist";
  description: string;
  format: string;
};

export type Stat = { value: string; label: string; sub?: string };

export type TimelineItem = { year: string; title: string; detail: string };

export type PressItem = { outlet: string; title: string; date: string; kind: string };

export type UsesItem = { category: string; items: { name: string; note: string }[] };
