import { describe, it, expect } from "vitest";
import { parsePrTitle, shouldAnnounce, humanizeSubject, projectFor } from "./pr";

describe("parsePrTitle", () => {
  it("splits type, scope, subject", () => {
    expect(parsePrTitle("feat(community): welcome header")).toEqual({
      type: "feat", scope: "community", subject: "welcome header",
    });
  });
  it("handles no scope", () => {
    expect(parsePrTitle("fix: broken link")).toEqual({ type: "fix", scope: null, subject: "broken link" });
  });
  it("falls back when unconventional", () => {
    expect(parsePrTitle("random title")).toEqual({ type: null, scope: null, subject: "random title" });
  });
});

describe("shouldAnnounce", () => {
  it("announces user-facing types", () => {
    expect(shouldAnnounce("feat(community): x", [])).toBe(true);
    expect(shouldAnnounce("fix(games): y", [])).toBe(true);
    expect(shouldAnnounce("chore(services): update prices", [])).toBe(true);
  });
  it("skips non-user-facing scopes and types", () => {
    expect(shouldAnnounce("chore(deps): bump lodash", [])).toBe(false);
    expect(shouldAnnounce("docs: readme", [])).toBe(false);
    expect(shouldAnnounce("refactor(auth): tidy", [])).toBe(false);
    expect(shouldAnnounce("random title", [])).toBe(false);
  });
  it("kill switch: no-announce label suppresses", () => {
    expect(shouldAnnounce("feat(community): x", ["no-announce"])).toBe(false);
    expect(shouldAnnounce("feat(community): x", ["No-Announce"])).toBe(false);
  });
});

describe("humanizeSubject", () => {
  it("capitalizes the first letter", () => {
    expect(humanizeSubject("welcome header")).toBe("Welcome header");
  });
});

describe("projectFor", () => {
  it("maps allowlisted repos to a project name", () => {
    expect(projectFor("bookasloth/shubham-datarkar")).toBe("the site");
    expect(projectFor("bookasloth/book-a-sloth")).toBe("Book A Sloth");
  });
  it("is case-insensitive on the repo name", () => {
    expect(projectFor("BookASloth/Book-A-Sloth")).toBe("Book A Sloth");
  });
  it("rejects everything not on the allowlist", () => {
    expect(projectFor("someone/else")).toBeNull();
    expect(projectFor("")).toBeNull();
    expect(projectFor(undefined)).toBeNull();
  });
  it("is not fooled by prototype keys", () => {
    expect(projectFor("constructor")).toBeNull();
    expect(projectFor("__proto__")).toBeNull();
  });
});
