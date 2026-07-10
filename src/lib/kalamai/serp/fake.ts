import type { SerpProvider, SerpResult, SerpInput } from "./provider";

/** Offline SERP: eight organic results (two crawl batches), PAA, one AI-Overview citation. */
export const FAKE_SERP: SerpResult = {
  organic: [
    { url: "https://example.com/nagpur-digital-marketing", rank: 1, title: "Digital Marketing Company in Nagpur" },
    { url: "https://acme.example/services/seo-nagpur", rank: 2, title: "SEO Services Nagpur" },
    { url: "https://beta.example/agency", rank: 3, title: "Best Digital Marketing Agency" },
    { url: "https://gamma.example/nagpur", rank: 4, title: "Nagpur Marketing Experts" },
    { url: "https://delta.example/seo", rank: 5, title: "Grow With SEO" },
    { url: "https://epsilon.example/ppc", rank: 6, title: "PPC and Ads" },
    { url: "https://zeta.example/content", rank: 7, title: "Content Marketing" },
    { url: "https://eta.example/local-seo", rank: 8, title: "Local SEO Guide" },
  ],
  paa: [
    "How much does digital marketing cost in Nagpur?",
    "Which is the best digital marketing agency in Nagpur?",
    "What does a digital marketing company do?",
  ],
  aiOverviewUrls: ["https://example.com/nagpur-digital-marketing"],
};

/** Deterministic provider for tests and local dev; returns a fixed fixture. */
export class FakeSerpProvider implements SerpProvider {
  constructor(private readonly result: SerpResult = FAKE_SERP) {}
  async fetch(_input: SerpInput): Promise<SerpResult> {
    return this.result;
  }
}
