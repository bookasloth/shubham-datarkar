export type SeoLandingContent = {
  areaName: string; // "India"
  areaServedType: "Country" | "City";
  path: string; // "/seo-expert-india"
  h1: string; // "SEO Expert in India"
  metaTitle: string; // bare keyword phrase, no brand
  metaDescription: string; // ~150 chars, keyword + CTA
  subhead: string;
  answer: string; // 40-60 words, self-contained
  serviceBlocks: { h3: string; definition: string }[]; // exactly 7
  process: { step: string; detail: string }[]; // 4
  differentiators: { label: string; value: string }[]; // number-backed
  pricingTiers: { name: string; price: string; currency: "INR"; features: string[] }[]; // 3
  faqs: { question: string; answer: string }[]; // 6-10, answer-first
  caseStudySlugs?: string[]; // filter into DB case_studies
  trustNames: string[]; // client names for the trust-bar text fallback
  updatedAt: string; // "2026-07-11"
};
