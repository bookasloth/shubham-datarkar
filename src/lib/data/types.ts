/** Shared content types. Shapes mirror what a CMS (Sanity) would return. */

export type IconName = string;

export type BlogCategory = "seo" | "ai" | "performance" | "content" | "saas" | "founder";

export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | { type: "callout"; variant?: "default" | "info" | "accent"; title?: string; text: string }
  | { type: "code"; lang: string; code: string };

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
