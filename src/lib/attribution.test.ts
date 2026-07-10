import { describe, expect, it } from "vitest";
import { aiSourceFor, parseFirstTouch, toAttributionRow } from "./attribution";

describe("aiSourceFor", () => {
  it("names known AI answer engines", () => {
    expect(aiSourceFor("https://chatgpt.com/c/abc")).toBe("ChatGPT");
    expect(aiSourceFor("https://www.perplexity.ai/search?q=x")).toBe("Perplexity");
    expect(aiSourceFor("https://claude.ai/chat/1")).toBe("Claude");
  });

  it("returns null for non-AI, empty, and malformed referrers", () => {
    expect(aiSourceFor("https://google.com/search")).toBeNull();
    expect(aiSourceFor("")).toBeNull();
    expect(aiSourceFor("not a url")).toBeNull();
  });
});

describe("parseFirstTouch", () => {
  it("records the landing path without the query string", () => {
    const t = parseFirstTouch("https://shubhamdatarkar.com/blog/seo/x?utm_source=li", "");
    expect(t.landingPage).toBe("/blog/seo/x");
  });

  it("extracts utm parameters", () => {
    const t = parseFirstTouch("https://x.com/?utm_source=li&utm_medium=social&utm_campaign=aeo", "");
    expect(t.utmSource).toBe("li");
    expect(t.utmMedium).toBe("social");
    expect(t.utmCampaign).toBe("aeo");
  });

  it("leaves utm fields null when absent and starts pagesSeen at 1", () => {
    const t = parseFirstTouch("https://x.com/", "");
    expect(t.utmSource).toBeNull();
    expect(t.pagesSeen).toBe(1);
    expect(t.referrer).toBeNull();
  });

  it("classifies an AI referrer", () => {
    const t = parseFirstTouch("https://x.com/", "https://chatgpt.com/c/1");
    expect(t.aiSource).toBe("ChatGPT");
    expect(t.referrer).toBe("https://chatgpt.com/c/1");
  });
});

describe("toAttributionRow", () => {
  const base = parseFirstTouch("https://x.com/p?utm_source=li", "https://chatgpt.com/c/1");

  it("returns an empty object when there is no attribution", () => {
    expect(toAttributionRow(null)).toEqual({});
    expect(toAttributionRow(undefined)).toEqual({});
  });

  it("maps camelCase fields onto snake_case columns", () => {
    const row = toAttributionRow(base);
    expect(row.first_landing_page).toBe("/p");
    expect(row.ai_source).toBe("ChatGPT");
    expect(row.utm_source).toBe("li");
    expect(row.utm_medium).toBeNull();
    expect(row.pages_seen).toBe(1);
  });

  it("clamps hostile input from the client", () => {
    const row = toAttributionRow({ ...base, landingPage: "/" + "a".repeat(500), pagesSeen: 1e9 });
    expect((row.first_landing_page as string).length).toBe(300);
    expect(row.pages_seen).toBe(9999);
  });

  it("rejects a non-numeric pagesSeen", () => {
    const row = toAttributionRow({ ...base, pagesSeen: Number.NaN });
    expect(row.pages_seen).toBeNull();
  });
});
