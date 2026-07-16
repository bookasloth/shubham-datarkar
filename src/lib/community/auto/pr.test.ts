import { describe, it, expect } from "vitest";
import { parsePrTitle, shouldAnnounce, humanizeSubject, projectFor, extractTweet } from "./pr";
import { pick } from "./templates";

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

  // The live regression: PR #209's subject began "@mentions ...", the feed
  // linkified it, and /community/u/mentions is nobody.
  it("drops a word-initial @ so an echoed title can't mint a phantom mention", () => {
    expect(humanizeSubject("@mentions with profile links and notify email")).toBe(
      "Mentions with profile links and notify email",
    );
    expect(humanizeSubject("ping @sam about the thing")).toBe("Ping sam about the thing");
  });

  it("leaves an @ that is mid-word alone", () => {
    expect(humanizeSubject("fix foo@bar.com parsing")).toBe("Fix foo@bar.com parsing");
  });
});

// The composition the webhook route performs, kept honest here because `pick` is
// random: no single sample proves the property, so assert it over the whole pool.
describe("composed PR post (fallback path)", () => {
  it("never mints a phantom mention, whichever template is drawn", () => {
    const title = humanizeSubject(parsePrTitle("feat(community): @mentions with profile links").subject);
    for (let i = 0; i < 200; i++) {
      const body = pick("pr", { title, project: "the site" });
      expect(body, `drew: ${body}`).not.toMatch(/(^|\s)@[a-z0-9]/i);
    }
  });
});

describe("extractTweet", () => {
  it("returns the author's line", () => {
    const body = "## What\nSome dev detail.\n\nTweet: You can now tag people with @.\n\n## Notes\nmore";
    expect(extractTweet(body)).toBe("You can now tag people with @.");
  });

  it("is case-insensitive and tolerates indentation", () => {
    expect(extractTweet("   tweet:   Shipped a thing.  ")).toBe("Shipped a thing.");
  });

  it("survives CRLF bodies (GitHub sends them)", () => {
    expect(extractTweet("intro\r\nTweet: Hello there.\r\nrest")).toBe("Hello there.");
  });

  it("returns null when absent, empty, or blank", () => {
    expect(extractTweet("no tweet line here")).toBeNull();
    expect(extractTweet("Tweet:")).toBeNull();
    expect(extractTweet("Tweet:    ")).toBeNull();
    expect(extractTweet(null)).toBeNull();
    expect(extractTweet(undefined)).toBeNull();
    expect(extractTweet("")).toBeNull();
  });

  it("takes only the first Tweet: line", () => {
    expect(extractTweet("Tweet: first\nTweet: second")).toBe("first");
  });

  it("does not match the word tweet mid-sentence", () => {
    expect(extractTweet("I should tweet: maybe later")).toBeNull();
  });

  it("caps at 500 chars", () => {
    expect(extractTweet("Tweet: " + "x".repeat(600))?.length).toBe(500);
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
