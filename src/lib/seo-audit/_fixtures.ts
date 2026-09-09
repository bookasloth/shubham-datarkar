// Test-only PageSignals factory. Defaults describe a healthy page; override per case.
import type { PageSignals } from "./signals";
import type { PageClass } from "./types";

export function mkPage(over: Partial<PageSignals> & { url: string; class: PageClass }): PageSignals {
  return {
    status: 200,
    ok: true,
    redirectHops: 0,
    https: true,
    title: "A perfectly reasonable page title about the topic",
    titleLength: 48,
    description: "A meta description of a sensible length between one hundred and twenty and one hundred sixty characters, describing the page well enough.",
    descriptionLength: 140,
    canonical: over.url,
    canonicalSelf: true,
    robotsIndex: true,
    hasOgTitle: true,
    hasOgImage: true,
    hasTwitterCard: true,
    schemas: [],
    schemaParseErrors: 0,
    h1Count: 1,
    h2Count: 3,
    h3Count: 0,
    skippedHeadingLevel: false,
    wordCount: 800,
    listCount: 2,
    imageCount: 3,
    imagesWithAlt: 3,
    internalLinks: [],
    externalLinkCount: 2,
    extractOk: true,
    junkRatio: 0.1,
    questionHeadings: 2,
    hasDates: true,
    hasTelLink: false,
    hasMailtoLink: false,
    mentionsTestimonials: false,
    hasSameAs: false,
    bodyFingerprint: `fingerprint-${over.url}`,
    ...over,
  };
}
