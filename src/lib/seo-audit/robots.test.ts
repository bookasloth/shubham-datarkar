import { describe, it, expect } from "vitest";
import { parseRobotsInfo, robotsAllows, aiCrawlerAccess } from "./robots";

describe("parseRobotsInfo + robotsAllows", () => {
  it("fails open when robots.txt is absent", () => {
    const info = parseRobotsInfo(null);
    expect(info.fetched).toBe(false);
    expect(robotsAllows(info, "/anything")).toBe(true);
  });

  it("honours Disallow prefixes in the * group", () => {
    const info = parseRobotsInfo("User-agent: *\nDisallow: /private\nAllow: /");
    expect(robotsAllows(info, "/private/x")).toBe(false);
    expect(robotsAllows(info, "/public")).toBe(true);
  });

  it("treats Disallow: / as a blanket block for that agent", () => {
    const info = parseRobotsInfo("User-agent: GPTBot\nDisallow: /");
    expect(robotsAllows(info, "/", "GPTBot")).toBe(false);
    expect(robotsAllows(info, "/", "Googlebot")).toBe(true); // falls back to * (none) → allowed
  });

  it("collects sitemaps", () => {
    const info = parseRobotsInfo("Sitemap: https://x.com/sitemap.xml");
    expect(info.sitemaps).toEqual(["https://x.com/sitemap.xml"]);
  });
});

describe("aiCrawlerAccess", () => {
  it("reports blocked AI crawlers", () => {
    const info = parseRobotsInfo("User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:");
    const access = aiCrawlerAccess(info);
    expect(access.find((a) => a.name === "GPTBot")?.allowed).toBe(false);
    expect(access.find((a) => a.name === "PerplexityBot")?.allowed).toBe(true);
  });
});
