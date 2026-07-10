import { site, sameAs } from "@/lib/site";

/**
 * Stable `@id` URIs for the site's core entities.
 *
 * Before this existed, `personSchema()` inlined a full Person node on all ~100
 * pages, and `articleSchema`/`serviceSchema`/`reviewSchema` each inlined another
 * copy. Search engines saw ~100 unlinked Person entities instead of one entity
 * referenced ~100 times. Every schema now references these IDs, and the full
 * nodes are emitted exactly once each — the Person + WebSite in the root layout,
 * the Organizations on /about.
 */
export const PERSON_ID = `${site.url}/#person`;
export const WEBSITE_ID = `${site.url}/#website`;

export const ORG_IDS = {
  timewheel: `${site.url}/#org-timewheel`,
  bogus: `${site.url}/#org-bogus`,
  bookASloth: `${site.url}/#org-bookasloth`,
  greyHawks: `${site.url}/#org-greyhawks`,
} as const;

/** A bare reference to the Person, for use as author / provider / itemReviewed. */
export const personRef = { "@id": PERSON_ID } as const;

/**
 * The canonical Person node. Emitted once per page inside the root layout's
 * `@graph`; everything else references {@link PERSON_ID}.
 */
export function personNode() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: site.name,
    alternateName: [site.alias, "Shubham N Datarkar"],
    url: site.url,
    email: `mailto:${site.email}`,
    jobTitle: [
      "Digital Marketer",
      "SEO Consultant",
      "AI Marketing Strategist",
      "Copywriter",
      "Founder",
      "Full Stack Developer",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nagpur",
      addressRegion: "Maharashtra",
      addressCountry: "IN",
    },
    sameAs,
    knowsAbout: [
      "Digital Marketing",
      "Search Engine Optimization",
      "Technical SEO",
      "On-page SEO",
      "Off-page SEO",
      "Local SEO",
      "Programmatic SEO",
      "Semantic SEO",
      "Content SEO",
      "Generative Engine Optimization",
      "Answer Engine Optimization",
      "Topical Authority",
      "Internal Linking",
      "Content Marketing",
      "Copywriting",
      "Conversion Copywriting",
      "Email Marketing",
      "Performance Marketing",
      "Google Ads",
      "Meta Ads",
      "Growth Marketing",
      "Marketing Automation",
      "AI Workflows",
      "AI Agents",
      "AI for Marketing",
      "SaaS Strategy",
      "Product Marketing",
      "MVP Development",
      "Branding",
      "Entrepreneurship",
      "Next.js",
      "React",
      "Supabase",
      "PostgreSQL",
      "Node.js",
    ],
    worksFor: [
      { "@id": ORG_IDS.timewheel },
      { "@id": ORG_IDS.bogus },
      { "@id": ORG_IDS.bookASloth },
      { "@id": ORG_IDS.greyHawks },
    ],
  };
}

/** The WebSite node. Emitted once per page inside the root layout's `@graph`. */
export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    alternateName: site.alias,
    url: site.url,
    publisher: { "@id": PERSON_ID },
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

/**
 * Site-wide JSON-LD: the Person and the WebSite, in one `@graph`. Emitted once,
 * in the root layout, so every page carries the canonical entities.
 */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [personNode(), websiteNode()],
  };
}

/**
 * The Organizations the Person is behind. Emitted once, on /about, each linked
 * back to {@link PERSON_ID}. Focus areas and roles come from the founder brief;
 * the three with a `since` are in `site.companies`, Grey Hawks is a co-founding
 * role without a dedicated page.
 */
export function organizationNodes() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_IDS.timewheel,
        name: "Timewheel Internet",
        description:
          "Internet and SaaS studio building booking, membership, and event products.",
        founder: personRef,
        knowsAbout: ["SaaS", "Internet Products", "Booking Software", "Membership Software"],
      },
      {
        "@type": "Organization",
        "@id": ORG_IDS.bogus,
        name: "The Bogus Company",
        description: "Creative and advertising studio — branding, copywriting, and campaigns.",
        founder: personRef,
        knowsAbout: ["Advertising", "Branding", "Copywriting", "Creative Strategy"],
      },
      {
        "@type": "Organization",
        "@id": ORG_IDS.bookASloth,
        name: "Book A Sloth",
        // The only org with a public site today; a real url makes this node
        // independently resolvable. The others honestly have none — omitted
        // rather than fabricated.
        url: "https://bookasloth.com",
        description: "Booking and scheduling SaaS. Shubham Datarkar is CMO.",
        employee: personRef,
        knowsAbout: ["Booking Software", "Scheduling", "Business Automation"],
      },
      {
        "@type": "Organization",
        "@id": ORG_IDS.greyHawks,
        name: "Grey Hawks Media",
        description: "Performance marketing agency — SEO, paid media, and content.",
        founder: personRef,
        knowsAbout: ["Performance Marketing", "SEO", "Content Marketing", "Digital Strategy"],
      },
    ],
  };
}
