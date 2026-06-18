import type { Metadata } from "next";
import { site, sameAs } from "@/lib/site";

type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
};

/**
 * Build a complete Metadata object with canonical, OG, and Twitter cards.
 * OG/Twitter images come from the file-based `opengraph-image` convention,
 * so they are intentionally not set here (setting them would override it).
 */
export function buildMetadata({
  title,
  description = site.description,
  path = "/",
  type = "website",
  publishedTime,
  modifiedTime,
  noIndex,
}: SeoInput = {}): Metadata {
  const url = `${site.url}${path}`;
  const fullTitle = title ? `${title} — ${site.name}` : `${site.name} · ${site.alias}`;

  return {
    title: title ?? `${site.name} · ${site.alias}`,
    description,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      url,
      title: fullTitle,
      description,
      siteName: site.name,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      creator: "@sndatarkar",
    },
  };
}

/* ----------------------------- JSON-LD ----------------------------- */

export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    alternateName: site.alias,
    url: site.url,
    email: `mailto:${site.email}`,
    jobTitle: "Founder, Marketer & Copywriter",
    address: { "@type": "PostalAddress", addressLocality: "Nagpur", addressCountry: "IN" },
    sameAs,
    knowsAbout: [
      "Copywriting",
      "Conversion Copywriting",
      "SEO",
      "Generative Engine Optimization",
      "Performance Marketing",
      "Content Marketing",
      "Growth Marketing",
      "Branding",
      "AI Automation",
      "SaaS",
      "Product Strategy",
      "Entrepreneurship",
      "WordPress",
    ],
  };
}

/**
 * ProfilePage wrapper for the /about page — tells search + answer engines this
 * page is the canonical profile of the Person entity (boosts entity confidence).
 */
export function profilePageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    // Nested entity drops its own @context (undefined keys are omitted by JSON.stringify).
    mainEntity: { ...personSchema(), "@context": undefined },
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The Bogus Company",
    founder: { "@type": "Person", name: site.name },
    url: site.url,
    logo: `${site.url}/opengraph-image`,
    sameAs,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    alternateName: site.alias,
    url: site.url,
    publisher: { "@type": "Person", name: site.name },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleSchema(input: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    image: input.image ?? `${site.url}/opengraph-image`,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { "@type": "Person", name: site.name, url: site.url },
    publisher: { "@type": "Person", name: site.name },
    mainEntityOfPage: `${site.url}${input.path}`,
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${site.url}${item.path}`,
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
