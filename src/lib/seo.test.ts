import { describe, it, expect } from "vitest";
import {
  articleSchema,
  buildMetadata,
  serviceSchema,
  productSchema,
  reviewSchema,
  speakingServiceSchema,
} from "@/lib/seo";
import { site } from "@/lib/site";
import type { Service, Product, Testimonial } from "@/lib/data/types";

const makeService = (over: Partial<Service> = {}): Service => ({
  slug: "seo",
  name: "SEO & Organic Growth",
  icon: "Search",
  tagline: "Compounding traffic",
  outcome: "Own your category in search.",
  description: "SEO as infrastructure.",
  deliverables: ["Audit"],
  process: [{ step: "Audit", detail: "Find what's winnable." }],
  startingAt: "₹1.5L / month",
  ...over,
});

describe("articleSchema", () => {
  const base = { title: "T", description: "D", path: "/blog/seo/x", datePublished: "2026-01-01" };

  it("falls back to a real, existing image (never /og/default.png)", () => {
    const s = articleSchema(base);
    expect(s.image).toBe(`${site.url}/opengraph-image`);
    expect(String(s.image)).not.toContain("/og/default.png");
  });

  it("uses a provided per-post image when passed", () => {
    const s = articleSchema({ ...base, image: `${site.url}/blog/seo/x/opengraph-image` });
    expect(s.image).toBe(`${site.url}/blog/seo/x/opengraph-image`);
  });
});

describe("buildMetadata", () => {
  it("twitter card creator is the real X handle", () => {
    const m = buildMetadata();
    expect((m.twitter as { creator?: string } | null)?.creator).toBe("@sndatarkar");
  });
});

describe("buildMetadata OG overrides", () => {
  it("defaults the OG title to the branded full title", () => {
    const m = buildMetadata({ title: "SEO Consultant in India", path: "/x" });
    expect(m.openGraph?.title).toBe("SEO Consultant in India — Shubham Datarkar");
  });

  it("lets the OG title differ from the SERP title", () => {
    const m = buildMetadata({ title: "SEO Consultant in India", ogTitle: "I make Google notice you", path: "/x" });
    expect(m.title).toBe("SEO Consultant in India");
    expect(m.openGraph?.title).toBe("I make Google notice you");
    expect(m.twitter?.title).toBe("I make Google notice you");
  });

  it("defaults the OG description to the meta description", () => {
    const m = buildMetadata({ description: "A plain description.", path: "/x" });
    expect(m.openGraph?.description).toBe("A plain description.");
  });

  it("lets the OG description differ", () => {
    const m = buildMetadata({ description: "A plain description.", ogDescription: "A biting one.", path: "/x" });
    expect(m.description).toBe("A plain description.");
    expect(m.openGraph?.description).toBe("A biting one.");
    expect(m.twitter?.description).toBe("A biting one.");
  });

  it("titleAbsolute escapes the root title template", () => {
    const m = buildMetadata({ title: "Shubham Datarkar — Digital Marketer", titleAbsolute: true, path: "/" });
    expect(m.title).toEqual({ absolute: "Shubham Datarkar — Digital Marketer" });
  });

  it("noIndex still produces index:false, follow:false", () => {
    const m = buildMetadata({ title: "Login", noIndex: true, path: "/games/login" });
    expect(m.robots).toEqual({ index: false, follow: false });
  });
});

describe("serviceSchema", () => {
  it("is a Service provided by the Person (by @id), with a priced Offer", () => {
    const s = serviceSchema(makeService()) as Record<string, unknown>;
    expect(s["@type"]).toBe("Service");
    // Provider references the canonical Person node, not an inlined duplicate.
    expect(s.provider).toEqual({ "@id": `${site.url}/#person` });
    expect(s.url).toBe(`${site.url}/services/seo`);
    const offer = s.offers as { "@type"?: string; priceCurrency?: string; description?: string };
    expect(offer["@type"]).toBe("Offer");
    expect(offer.priceCurrency).toBe("INR");
    expect(offer.description).toContain("₹1.5L / month");
  });

  it("omits the Offer when the service is priced 'On request'", () => {
    const s = serviceSchema(makeService({ slug: "speaking", startingAt: "On request" })) as Record<string, unknown>;
    expect("offers" in s).toBe(false);
  });
});

describe("productSchema", () => {
  const base: Product = {
    slug: "book-a-sloth",
    name: "Book A Sloth",
    color: "#D95D00",
    tagline: "Easy scheduling.",
    about: "A booking platform.",
    category: "Scheduling SaaS",
    status: "Beta",
    url: "https://bookasloth.in",
  };

  it("is a Product with brand + category, and keeps the live URL", () => {
    const s = productSchema(base) as Record<string, unknown>;
    expect(s["@type"]).toBe("Product");
    expect((s.brand as { name?: string }).name).toBe("Book A Sloth");
    expect(s.category).toBe("Scheduling SaaS");
    expect(s.url).toBe("https://bookasloth.in");
  });

  it("omits url when the product has none", () => {
    const s = productSchema({ ...base, url: undefined }) as Record<string, unknown>;
    expect("url" in s).toBe(false);
  });
});

describe("reviewSchema", () => {
  const testimonials: Testimonial[] = [
    { quote: "Rare clarity.", name: "Sri", role: "Founder", company: "Ad Agency", initials: "SR" },
  ];

  it("maps each testimonial to a Review of the Person, with no fabricated rating", () => {
    const [r] = reviewSchema(testimonials);
    expect(r["@type"]).toBe("Review");
    expect(r.reviewBody).toBe("Rare clarity.");
    expect((r.author as { name?: string }).name).toBe("Sri");
    // The review is about the canonical Person, referenced by @id.
    expect(r.itemReviewed).toEqual({ "@id": `${site.url}/#person` });
    expect("reviewRating" in r).toBe(false);
  });
});

describe("speakingServiceSchema", () => {
  it("is a Speaking & Workshops Service, not an Event", () => {
    const s = speakingServiceSchema();
    expect(s["@type"]).toBe("Service");
    expect(s.serviceType).toBe("Speaking & Workshops");
    expect(s.url).toBe(`${site.url}/speaking`);
  });
});
