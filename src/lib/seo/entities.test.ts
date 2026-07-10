import { describe, it, expect } from "vitest";
import {
  PERSON_ID,
  WEBSITE_ID,
  ORG_IDS,
  personRef,
  personNode,
  websiteNode,
  siteGraph,
  organizationNodes,
} from "./entities";
import { articleSchema, serviceSchema, reviewSchema, profilePageSchema } from "@/lib/seo";
import type { Service, Testimonial } from "@/lib/data/types";

/** Every `@id` string that appears anywhere in a JSON structure. */
function collectDefinedIds(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const v of value) collectDefinedIds(v, into);
  } else if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    // A node DEFINES an id when it also carries a @type; a bare { "@id" } is a reference.
    if (typeof node["@id"] === "string" && "@type" in node) into.add(node["@id"] as string);
    for (const v of Object.values(node)) collectDefinedIds(v, into);
  }
}

/** Every `@id` used as a bare reference: { "@id": ... } with no @type. */
function collectReferencedIds(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const v of value) collectReferencedIds(v, into);
  } else if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    if (typeof node["@id"] === "string" && !("@type" in node)) into.add(node["@id"] as string);
    for (const v of Object.values(node)) collectReferencedIds(v, into);
  }
}

describe("entity graph", () => {
  it("the site graph defines the Person and the WebSite exactly once", () => {
    const graph = siteGraph()["@graph"];
    const personDefs = graph.filter((n) => n["@type"] === "Person");
    const websiteDefs = graph.filter((n) => n["@type"] === "WebSite");
    expect(personDefs).toHaveLength(1);
    expect(websiteDefs).toHaveLength(1);
    expect(personDefs[0]["@id"]).toBe(PERSON_ID);
    expect(websiteDefs[0]["@id"]).toBe(WEBSITE_ID);
  });

  it("the WebSite's publisher references the Person id", () => {
    expect(websiteNode().publisher).toEqual({ "@id": PERSON_ID });
  });

  it("the WebSite carries a SearchAction targeting /search?q=", () => {
    expect(JSON.stringify(websiteNode().potentialAction)).toContain(
      "/search?q={search_term_string}",
    );
  });

  it("the Person's worksFor references every Organization id", () => {
    const ids = personNode().worksFor.map((o) => o["@id"]);
    expect(ids.sort()).toEqual(Object.values(ORG_IDS).sort());
  });

  it("every worksFor reference resolves to an Organization the /about graph defines", () => {
    const defined = new Set<string>();
    collectDefinedIds(organizationNodes(), defined);
    for (const ref of personNode().worksFor) {
      expect(defined.has(ref["@id"]), ref["@id"]).toBe(true);
    }
  });

  it("every Organization node links back to the Person id", () => {
    for (const org of organizationNodes()["@graph"]) {
      const backref = org.founder ?? org.employee;
      expect(backref, org["@id"]).toEqual({ "@id": PERSON_ID });
    }
  });

  it("no @id is defined twice across the site graph and the /about graph", () => {
    const seen = new Map<string, number>();
    for (const graph of [siteGraph(), organizationNodes()]) {
      const ids = new Set<string>();
      collectDefinedIds(graph, ids);
      for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    // Person + WebSite (site graph) + 4 orgs (/about) — all distinct.
    const duplicated = [...seen.entries()].filter(([, n]) => n > 1);
    expect(duplicated).toEqual([]);
  });

  it("the consuming schemas reference the Person by id, not by inlining it", () => {
    const article = articleSchema({
      title: "T",
      description: "D",
      path: "/blog/x/y",
      datePublished: "2026-01-01",
    });
    expect(article.author).toEqual(personRef);
    expect(article.publisher).toEqual(personRef);

    const fakeService = { slug: "seo", name: "SEO", description: "d", startingAt: "on request" } as Service;
    expect(serviceSchema(fakeService).provider).toEqual(personRef);

    const reviews = reviewSchema([{ name: "A", quote: "q" } as Testimonial]);
    expect(reviews[0].itemReviewed).toEqual(personRef);

    // profilePage points at the Person the site graph already defines on the same page.
    expect(profilePageSchema().mainEntity).toEqual(personRef);
  });

  it("a referenced Person id is never left dangling on a page that carries the site graph", () => {
    // The site graph (root layout) defines PERSON_ID on every page, so any page
    // whose per-page schema references personRef has a resolvable target.
    const defined = new Set<string>();
    collectDefinedIds(siteGraph(), defined);
    expect(defined.has(PERSON_ID)).toBe(true);

    const referenced = new Set<string>();
    collectReferencedIds(profilePageSchema(), referenced);
    collectReferencedIds(
      articleSchema({ title: "T", description: "D", path: "/p", datePublished: "2026-01-01" }),
      referenced,
    );
    for (const ref of referenced) {
      expect(defined.has(ref), ref).toBe(true);
    }
  });
});
