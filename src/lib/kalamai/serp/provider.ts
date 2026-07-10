/** SERP source contract. One real implementation (DataForSEO) + a fake for tests. */

export type SerpOrganic = { url: string; rank: number; title: string | null };

export type SerpResult = {
  organic: SerpOrganic[]; // ordered, up to 30
  paa: string[]; // People Also Ask questions
  aiOverviewUrls: string[]; // URLs cited in the AI Overview block (may be empty)
};

export type SerpInput = { keyword: string; country: string; locale: string };

export interface SerpProvider {
  fetch(input: SerpInput): Promise<SerpResult>;
}
