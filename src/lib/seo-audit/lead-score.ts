// Internal lead-quality score (spec §20) — separate from the visitor-facing SEO
// and AI scores, and not shown to the visitor. A strong lead has BOTH a real
// improvement opportunity AND a real business behind it (commercial pages, a
// content footprint, signs of active maintenance). This feeds the CRM/outbound.
import type { PageSignals } from "./signals";

export type LeadScore = {
  seoOpportunity: number; // 0-100 (higher = more room to improve)
  aiOpportunity: number;
  businessQuality: number; // 0-100
  score: number; // 0-100 blended
  bucket: "HOT" | "WARM" | "COLD";
};

const COMMERCIAL = new Set(["service", "product"]);

export function scoreLead(scores: { seo: number; ai: number }, pages: PageSignals[]): LeadScore {
  const ok = pages.filter((p) => p.ok);
  const seoOpportunity = clamp(100 - scores.seo);
  const aiOpportunity = clamp(100 - scores.ai);

  const hasCommercial = ok.some((p) => COMMERCIAL.has(p.class));
  const footprint = ok.length >= 5;
  const maintained = ok.some((p) => p.hasDates);
  const contactable = ok.some((p) => p.hasTelLink || p.hasMailtoLink || p.class === "contact");
  const businessQuality = clamp(
    (hasCommercial ? 35 : 0) + (footprint ? 25 : Math.round((ok.length / 5) * 25)) + (maintained ? 20 : 0) + (contactable ? 20 : 0),
  );

  const opportunity = Math.round((seoOpportunity + aiOpportunity) / 2);
  const score = Math.round(opportunity * 0.6 + businessQuality * 0.4);

  // HOT = clear opportunity AND a real, commercial business worth pursuing.
  const bucket: LeadScore["bucket"] =
    opportunity >= 45 && businessQuality >= 55 && hasCommercial ? "HOT" : score >= 45 ? "WARM" : "COLD";

  return { seoOpportunity, aiOpportunity, businessQuality, score, bucket };
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}
