import type { Metadata } from "next";
import { site } from "@/lib/site";
import { personRef } from "./seo/entities";
import type { Service, Product, Testimonial } from "@/lib/data/types";

type SeoInput = {
  /**
   * Keyword phrase, 15-40 chars, WITHOUT the brand name. The root layout's
   * `title.template` appends " — Shubham Datarkar" (19 chars), landing the
   * rendered <title> in the 30-60 window the audit checks. Writing the brand
   * into this argument double-brands the tag.
   */
  title?: string;
  description?: string;
  /** Social-card headline. Defaults to the branded full title. */
  ogTitle?: string;
  /** Social-card body. Defaults to `description`. */
  ogDescription?: string;
  /** Opt out of the root title template. The homepage needs this. */
  titleAbsolute?: boolean;
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
  ogTitle,
  ogDescription,
  titleAbsolute,
  path = "/",
  type = "website",
  publishedTime,
  modifiedTime,
  noIndex,
}: SeoInput = {}): Metadata {
  const url = `${site.url}${path}`;
  const fullTitle = title ? `${title} — ${site.name}` : `${site.name} · ${site.alias}`;
  const socialTitle = ogTitle ?? fullTitle;
  const socialDescription = ogDescription ?? description;
  const plainTitle = title ?? `${site.name} · ${site.alias}`;

  return {
    title: titleAbsolute ? { absolute: plainTitle } : plainTitle,
    description,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      url,
      title: socialTitle,
      description: socialDescription,
      siteName: site.name,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      creator: "@sndatarkar",
    },
  };
}

/* ----------------------------- JSON-LD ----------------------------- */
/*
 * The canonical Person and WebSite nodes live in `./seo/entities` and are
 * emitted once per page by the root layout. The builders below reference the
 * Person by `@id` (`personRef`) instead of inlining it — see entities.ts.
 */

/**
 * ProfilePage wrapper for the /about page — tells search + answer engines this
 * page is the canonical profile of the Person entity (boosts entity confidence).
 * References the Person the root layout's graph already defines on this page.
 */
export function profilePageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: personRef,
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
    author: personRef,
    publisher: personRef,
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

/**
 * Service offering — provider is the Person. An `Offer` is attached only when a
 * real starting price exists ("On request" services emit no Offer rather than a
 * priceless one). No numeric `price`: the rates are ranges ("₹1.5L / month"),
 * carried honestly in the Offer description.
 */
export function serviceSchema(service: Service) {
  const url = `${site.url}/services/${service.slug}`;
  const hasPrice = service.startingAt.trim().toLowerCase() !== "on request";
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: service.name,
    description: service.description,
    provider: personRef,
    areaServed: "Worldwide",
    url,
    ...(hasPrice
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            url,
            availability: "https://schema.org/InStock",
            description: `Starting at ${service.startingAt}`,
          },
        }
      : {}),
  };
}

export type LandingOffer = { name: string; price: string; description: string };

/**
 * SEO landing-page Service node. Unlike serviceSchema (bound to the Service DB
 * type + /services URL, areaServed "Worldwide"), this targets a geography and
 * carries productized tiers as an OfferCatalog. `areaServed` is a parameter so
 * the city template passes { type: "City", name } with no code change.
 * No aggregateRating: no real numeric ratings exist to mark up honestly.
 */
export function seoLandingSchema(input: {
  path: string;
  name: string;
  areaServed: { type: "Country" | "City"; name: string };
  offers: LandingOffer[];
}): Record<string, unknown> {
  const url = `${site.url}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Search Engine Optimization",
    name: input.name,
    url,
    provider: personRef,
    areaServed: { "@type": input.areaServed.type, name: input.areaServed.name },
    ...(input.offers.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: input.name,
            itemListElement: input.offers.map((o) => ({
              "@type": "Offer",
              name: o.name,
              price: o.price,
              priceCurrency: "INR",
              description: o.description,
              url: `${url}#pricing`,
            })),
          },
        }
      : {}),
  };
}

/**
 * Product (SaaS) entity. No public price, so no `Offer` is fabricated — name,
 * description, category, brand, and live URL only.
 */
export function productSchema(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.about,
    category: product.category,
    brand: { "@type": "Brand", name: product.name },
    ...(product.url ? { url: product.url } : {}),
  };
}

/**
 * Client testimonials as `Review` nodes about the Person. Ratings are omitted
 * (no real numeric scores exist — a fabricated 5★ AggregateRating would be a
 * structured-data violation), so this feeds entity trust without faking stars.
 */
export function reviewSchema(testimonials: Testimonial[]) {
  return testimonials.map((t) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    reviewBody: t.quote,
    author: {
      "@type": "Person",
      name: t.name,
      ...(t.role ? { jobTitle: t.role } : {}),
      ...(t.company ? { worksFor: { "@type": "Organization", name: t.company } } : {}),
    },
    itemReviewed: personRef,
  }));
}

/**
 * Speaking offering on /speaking — an honest `Service`, not `Event`: there are
 * no scheduled engagements with real dates/venues to mark up. Swap to `Event`
 * schema once concrete talks exist.
 */
export function speakingServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Speaking & Workshops",
    name: "Keynotes & Workshops by Shubham Datarkar",
    description:
      "Keynotes and workshops on SEO, AI workflows, and founder-led growth — built on real experiments and outcomes.",
    provider: personRef,
    areaServed: "Worldwide",
    url: `${site.url}/speaking`,
  };
}
