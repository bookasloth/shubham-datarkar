import { describe, it, expect } from "vitest";
import { pageTypeOf, isPrivate, isIndexable, ROBOTS_DISALLOW_PREFIXES } from "./routes";

describe("pageTypeOf", () => {
  it("classifies the marketing pillars", () => {
    for (const route of ["/", "/me", "/about", "/my-story", "/philosophy", "/speaking"]) {
      expect(pageTypeOf(route)).toBe("pillar");
    }
  });

  it("classifies /me as a pillar, not the hub fallback", () => {
    // `/me` arrived with the homepage split (PR #110), after routes.ts existed.
    // An unmapped route falls through to `hub` — the safe default, but the wrong
    // one for a long-form founder story that should face the pillar checks.
    expect(pageTypeOf("/me")).toBe("pillar");
    expect(isIndexable("/me")).toBe(true);
  });

  it("classifies the SEO Expert national landing as a pillar", () => {
    expect(pageTypeOf("/seo-expert-india")).toBe("pillar");
    expect(isIndexable("/seo-expert-india")).toBe(true);
  });

  it("classifies detail pages as pillars", () => {
    expect(pageTypeOf("/services/seo")).toBe("pillar");
    expect(pageTypeOf("/products/alluminaty")).toBe("pillar");
    expect(pageTypeOf("/case-studies/corart-meta-lead-gen")).toBe("pillar");
    expect(pageTypeOf("/blog/seo/some-post-slug")).toBe("pillar");
  });

  it("classifies index pages as hubs, not pillars", () => {
    expect(pageTypeOf("/services")).toBe("hub");
    expect(pageTypeOf("/products")).toBe("hub");
    expect(pageTypeOf("/case-studies")).toBe("hub");
    expect(pageTypeOf("/blog")).toBe("hub");
  });

  it("treats a blog category as a hub and a blog post as a pillar", () => {
    expect(pageTypeOf("/blog/seo")).toBe("hub");
    expect(pageTypeOf("/blog/seo/technical-seo-guide")).toBe("pillar");
  });

  it("classifies the public game and community landings as hubs", () => {
    for (const route of ["/games", "/games/alfazy", "/games/hit-and-blow", "/games/integra", "/community"]) {
      expect(pageTypeOf(route)).toBe("hub");
    }
  });

  it("classifies /members as app, because it is auth-gated and already noindexed", () => {
    // /members/page.tsx calls requireMember("/members") and members/layout.tsx sets
    // `robots: { index: false }`. Treating it as an indexable hub put an auth-gated,
    // noindexed page into the sitemap.
    expect(pageTypeOf("/members")).toBe("app");
    expect(isIndexable("/members")).toBe(false);
    expect(isPrivate("/members")).toBe(true);
  });

  it("classifies utility pages", () => {
    for (const route of ["/contact", "/book", "/link", "/help", "/support", "/support/supporters", "/support/updates", "/privacy-policy", "/terms-of-use"]) {
      expect(pageTypeOf(route)).toBe("utility");
    }
  });

  it("classifies admin subtrees as app", () => {
    expect(pageTypeOf("/admin")).toBe("app");
    expect(pageTypeOf("/admin/seo/pages")).toBe("app");
    expect(pageTypeOf("/dashboard")).toBe("app");
    expect(pageTypeOf("/login")).toBe("app");
    expect(pageTypeOf("/search")).toBe("app");
  });

  it("classifies auth and account routes under public subtrees as app", () => {
    for (const route of [
      "/games/profile",
      "/members/account", "/members/upgrade", "/members/tools",
      "/community/compose", "/community/me", "/community/bookmarks",
      "/unsubscribe", "/subscriber-assets",
    ]) {
      expect(pageTypeOf(route)).toBe("app");
    }
  });

  it("classifies per-game archive and leaderboard as app", () => {
    expect(pageTypeOf("/games/alfazy/archive")).toBe("app");
    expect(pageTypeOf("/games/hit-and-blow/leaderboard")).toBe("app");
    expect(pageTypeOf("/games/integra/leaderboard")).toBe("app");
  });

  it("classifies gated dynamic templates as app", () => {
    expect(pageTypeOf("/games/alfazy/[puzzle]")).toBe("app");
    expect(pageTypeOf("/members/tools/[slug]")).toBe("app");
    expect(pageTypeOf("/members/resources/[slug]")).toBe("app");
    expect(pageTypeOf("/support/updates/[code]")).toBe("app");
  });

  it("does not let the /profile prefix swallow /games/profile via prefix matching", () => {
    // Both are app, but for different reasons — this pins that /games/profile is
    // matched by the explicit route list, not by a sloppy startsWith("/profile").
    expect(pageTypeOf("/profile")).toBe("app");
    expect(pageTypeOf("/games/profile")).toBe("app");
    expect(pageTypeOf("/profiles-of-founders")).toBe("hub");
  });

  it("falls back to hub for anything unrecognised", () => {
    expect(pageTypeOf("/tools")).toBe("hub");
    expect(pageTypeOf("/tools/roas-calculator")).toBe("hub");
    expect(pageTypeOf("/newsletter")).toBe("hub");
    expect(pageTypeOf("/some-new-page-nobody-mapped")).toBe("hub");
  });
});

describe("isPrivate", () => {
  it("is true exactly for app routes", () => {
    expect(isPrivate("/admin/seo")).toBe(true);
    expect(isPrivate("/members/account")).toBe(true);
    expect(isPrivate("/about")).toBe(false);
    expect(isPrivate("/games")).toBe(false);
  });
});

describe("isIndexable", () => {
  it("excludes app routes", () => {
    expect(isIndexable("/members/account")).toBe(false);
    expect(isIndexable("/unsubscribe")).toBe(false);
    expect(isIndexable("/admin")).toBe(false);
  });

  it("excludes unexpanded dynamic templates, which are not URLs", () => {
    expect(isIndexable("/community/p/[id]")).toBe(false);
    expect(isIndexable("/blog/[category]")).toBe(false);
  });

  it("includes real public routes", () => {
    for (const route of ["/", "/about", "/blog", "/blog/seo", "/services/seo", "/games", "/link", "/privacy-policy"]) {
      expect(isIndexable(route)).toBe(true);
    }
  });
});

describe("ROBOTS_DISALLOW_PREFIXES", () => {
  it("contains only server-private subtrees, not app routes under public ones", () => {
    expect([...ROBOTS_DISALLOW_PREFIXES].sort()).toEqual(
      ["/admin", "/dashboard", "/login", "/profile", "/search", "/settings", "/success"].sort(),
    );
  });

  it("every disallowed prefix classifies as app", () => {
    for (const p of ROBOTS_DISALLOW_PREFIXES) {
      expect(pageTypeOf(p)).toBe("app");
    }
  });

  it("does NOT disallow app routes that must stay crawlable to be seen as noindex", () => {
    // Googlebot cannot read a `noindex` tag on a URL it is forbidden to fetch.
    // These are linked from public nav, so they must be crawlable AND noindexed.
    for (const route of ["/members/account", "/community/compose", "/unsubscribe"]) {
      expect(pageTypeOf(route)).toBe("app");
      expect(ROBOTS_DISALLOW_PREFIXES.some((p) => route.startsWith(p))).toBe(false);
    }
  });
});
