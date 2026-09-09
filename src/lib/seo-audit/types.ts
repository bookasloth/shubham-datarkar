// Shared types for the public SEO + AI-visibility audit engine.
// Distinct from src/lib/seo/* (which grades this site's own known routes).
// Types are added slice by slice; this file is the single import surface.

/** Coarse page role, inferred from URL + content. Drives crawl priority + scoring thresholds. */
export type PageClass =
  | "home"
  | "service"
  | "product"
  | "category"
  | "location"
  | "about"
  | "contact"
  | "author"
  | "article"
  | "other";

/** One URL selected for the crawl, with its class and a sort priority (lower = crawl sooner). */
export type DiscoveredUrl = {
  url: string;
  class: PageClass;
  priority: number;
};
