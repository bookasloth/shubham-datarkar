import { describe, it, expect } from "vitest";

// Pure helpers live in pr.ts (note-llm.ts imports "server-only", which throws under vitest).
import { stripHandles, cleanNote, isValidNote, chooseNote, distillBody, buildBrief } from "./pr";

describe("stripHandles", () => {
  it("drops word-initial @ so the note can't tag/email a real person", () => {
    expect(stripHandles("thanks @sam and @jo")).toBe("thanks sam and jo");
  });
  it("leaves mid-word @ (emails) intact", () => {
    expect(stripHandles("fixed foo@bar.com parsing")).toBe("fixed foo@bar.com parsing");
  });
});

describe("cleanNote", () => {
  it("collapses whitespace and trims", () => {
    expect(cleanNote("  a   b\n c ")).toBe("a b c");
  });
  it("caps at 500 chars", () => {
    expect(cleanNote("x".repeat(600)).length).toBe(500);
  });
});

describe("isValidNote", () => {
  it("accepts a one-word note (no minimum length)", () => {
    expect(isValidNote("Concerning.")).toBe(true);
  });
  it("rejects empty", () => {
    expect(isValidNote("")).toBe(false);
  });
  it("rejects > 500 chars", () => {
    expect(isValidNote("x".repeat(501))).toBe(false);
  });
  it("rejects emoji (house style)", () => {
    expect(isValidNote("shipped it 🚀")).toBe(false);
    expect(isValidNote("done ✅")).toBe(false);
  });
});

describe("chooseNote", () => {
  it("returns the judged winner", () => {
    expect(
      chooseNote({ draft_a: "aaa", draft_b: "bbb", winner: "b", reason: "" }),
    ).toBe("bbb");
  });
  it("falls back to the loser when the winner fails house rules", () => {
    expect(
      chooseNote({ draft_a: "good line", draft_b: "nope 🚀", winner: "b", reason: "" }),
    ).toBe("good line");
  });
  it("returns null when both drafts are unusable (→ template pool)", () => {
    expect(chooseNote({ draft_a: "", draft_b: "x🚀", winner: "a", reason: "" })).toBeNull();
  });
  it("strips @handles from the chosen draft", () => {
    expect(
      chooseNote({ draft_a: "shoutout @nobody", draft_b: "", winner: "a", reason: "" }),
    ).toBe("shoutout nobody");
  });
});

describe("distillBody", () => {
  it("strips HTML comments and the author Tweet: line", () => {
    const out = distillBody("<!-- template -->\nDid a thing.\nTweet: the public line\nmore");
    expect(out).not.toContain("template");
    expect(out).not.toContain("the public line");
    expect(out).toContain("Did a thing.");
  });
});

describe("buildBrief", () => {
  it("parses the title and carries the project", () => {
    const b = buildBrief({
      project: "the site",
      title: "feat(community): infinite scroll",
      body: "body text",
      labels: ["enhancement"],
    });
    expect(b).toMatchObject({
      project: "the site",
      type: "feat",
      scope: "community",
      subject: "infinite scroll",
      labels: ["enhancement"],
    });
  });
});

