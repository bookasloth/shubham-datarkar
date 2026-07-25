import { describe, it, expect } from "vitest";
import { validatePost } from "./validate";

const base = { type: "text", body: "hello", imageCount: 0, youtubeUrl: "" };
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe("validatePost", () => {
  it("accepts a text post", () => {
    expect(validatePost(base)).toMatchObject({ ok: true, type: "text", body: "hello" });
  });
  it("rejects an unknown type", () =>
    expect(validatePost({ ...base, type: "gif" })).toMatchObject({ ok: false }));
  it("rejects empty text", () =>
    expect(validatePost({ ...base, body: "   " })).toMatchObject({ ok: false }));
  it("rejects over 500 chars", () =>
    expect(validatePost({ ...base, body: "x".repeat(501) })).toMatchObject({ ok: false }));
  it("rejects blocked words", () =>
    expect(validatePost({ ...base, body: "free porn" })).toMatchObject({ ok: false }));

  it("accepts image post with 1-4 images and no body", () =>
    expect(validatePost({ ...base, type: "image", body: "", imageCount: 3 })).toMatchObject({
      ok: true,
      type: "image",
    }));
  it("rejects image post with 0 images", () =>
    expect(validatePost({ ...base, type: "image", body: "", imageCount: 0 })).toMatchObject({ ok: false }));
  it("rejects image post with 5 images", () =>
    expect(validatePost({ ...base, type: "image", body: "", imageCount: 5 })).toMatchObject({ ok: false }));

  it("accepts a youtube post and extracts the id", () =>
    expect(
      validatePost({ ...base, type: "youtube", body: "", youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" }),
    ).toMatchObject({ ok: true, type: "youtube", youtubeId: "dQw4w9WgXcQ" }));
  it("rejects a non-youtube url", () =>
    expect(
      validatePost({ ...base, type: "youtube", body: "", youtubeUrl: "https://vimeo.com/123" }),
    ).toMatchObject({ ok: false }));

  describe("polls", () => {
    const poll = { ...base, type: "poll", body: "" };

    it("accepts 2 options and indexes them", () => {
      const r = validatePost({ ...poll, pollOptions: ["Yes", "No"] });
      expect(r).toMatchObject({ ok: true, type: "poll" });
      if (r.ok) expect(r.poll?.options).toEqual([
        { i: 0, label: "Yes" },
        { i: 1, label: "No" },
      ]);
    });
    it("accepts 4 options", () =>
      expect(validatePost({ ...poll, pollOptions: ["a", "b", "c", "d"] })).toMatchObject({ ok: true }));
    it("rejects 1 option", () =>
      expect(validatePost({ ...poll, pollOptions: ["only"] })).toMatchObject({ ok: false }));
    it("rejects 5 options", () =>
      expect(validatePost({ ...poll, pollOptions: ["a", "b", "c", "d", "e"] })).toMatchObject({ ok: false }));
    it("drops blank options, then rejects if too few remain", () =>
      expect(validatePost({ ...poll, pollOptions: ["a", "   ", ""] })).toMatchObject({ ok: false }));
    it("rejects an over-long option", () =>
      expect(validatePost({ ...poll, pollOptions: ["a", "x".repeat(81)] })).toMatchObject({ ok: false }));
    it("rejects a blocked option label", () =>
      expect(validatePost({ ...poll, pollOptions: ["clean", "free porn"] })).toMatchObject({ ok: false }));
    it("accepts a future closes_at", () =>
      expect(validatePost({ ...poll, pollOptions: ["a", "b"], pollClosesAt: future })).toMatchObject({ ok: true }));
    it("rejects a past closes_at", () =>
      expect(validatePost({ ...poll, pollOptions: ["a", "b"], pollClosesAt: past })).toMatchObject({ ok: false }));
    it("rejects an unparseable closes_at", () =>
      expect(validatePost({ ...poll, pollOptions: ["a", "b"], pollClosesAt: "not a date" })).toMatchObject({
        ok: false,
      }));
    it("accepts an absent closes_at", () => {
      const r = validatePost({ ...poll, pollOptions: ["a", "b"] });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.poll?.closes_at).toBeUndefined();
    });

    it("plain poll carries no quiz fields", () => {
      const r = validatePost({ ...poll, pollOptions: ["a", "b"] });
      if (r.ok) {
        expect(r.poll?.mode).toBeUndefined();
        expect(r.poll?.correct).toBeUndefined();
      }
    });

    describe("quiz", () => {
      it("accepts a quiz with a valid correct answer", () => {
        const r = validatePost({ ...poll, pollMode: "quiz", pollOptions: ["a", "b", "c"], pollCorrect: "2" });
        expect(r).toMatchObject({ ok: true });
        if (r.ok) expect(r.poll).toMatchObject({ mode: "quiz", correct: 2 });
      });
      it("rejects a quiz with no correct answer marked", () =>
        expect(validatePost({ ...poll, pollMode: "quiz", pollOptions: ["a", "b"] })).toMatchObject({ ok: false }));
      it("rejects a quiz whose correct index is out of range", () =>
        expect(
          validatePost({ ...poll, pollMode: "quiz", pollOptions: ["a", "b"], pollCorrect: "9" }),
        ).toMatchObject({ ok: false }));
      it("re-maps the correct index after a blank option is dropped", () => {
        // options ["a", "", "b"] → kept ["a","b"]; original position 2 ("b") becomes index 1.
        const r = validatePost({ ...poll, pollMode: "quiz", pollOptions: ["a", "", "b"], pollCorrect: "2" });
        expect(r).toMatchObject({ ok: true });
        if (r.ok) expect(r.poll?.correct).toBe(1);
      });
      it("rejects when the marked-correct option was left blank", () => {
        // position 1 is blank and dropped, so it can't be the correct answer.
        const r = validatePost({ ...poll, pollMode: "quiz", pollOptions: ["a", "", "b"], pollCorrect: "1" });
        expect(r).toMatchObject({ ok: false });
      });
    });
  });


  describe("§7 composer types + fields", () => {
    it("accepts a quote with a source", () => {
      const r = validatePost({ ...base, type: "quote", body: "Ship it", source: "me, 3am" });
      expect(r).toMatchObject({ ok: true, type: "quote", body: "Ship it" });
      if (r.ok) expect(r.meta?.source).toBe("me, 3am");
    });
    it("rejects an empty quote", () =>
      expect(validatePost({ ...base, type: "quote", body: "" })).toMatchObject({ ok: false }));

    it("accepts a link and normalises the url into meta", () => {
      const r = validatePost({ ...base, type: "link", body: "", linkUrl: "https://example.com/x" });
      expect(r).toMatchObject({ ok: true, type: "link" });
      if (r.ok) expect(r.meta?.url).toBe("https://example.com/x");
    });
    it("rejects a non-http link scheme", () =>
      expect(validatePost({ ...base, type: "link", body: "", linkUrl: "javascript:alert(1)" })).toMatchObject({
        ok: false,
      }));
    it("rejects a junk link", () =>
      expect(validatePost({ ...base, type: "link", body: "", linkUrl: "not a url" })).toMatchObject({ ok: false }));

    it("accepts a chat with a speaker line", () =>
      expect(validatePost({ ...base, type: "chat", body: "Me: hi\nYou: bye" })).toMatchObject({
        ok: true,
        type: "chat",
      }));
    it("rejects a chat with no speaker lines", () =>
      expect(validatePost({ ...base, type: "chat", body: "just a sentence" })).toMatchObject({ ok: false }));

    it("keeps up to 5 clean tags, lowercased and de-hashed", () => {
      const r = validatePost({ ...base, tags: ["#SEO", "growth", "seo"] });
      if (r.ok) expect(r.tags).toEqual(["seo", "growth"]);
    });
    it("rejects a 6th tag", () =>
      expect(validatePost({ ...base, tags: ["a", "b", "c", "d", "e", "f"] })).toMatchObject({ ok: false }));
    it("rejects a tag with illegal characters", () =>
      expect(validatePost({ ...base, tags: ["not a tag"] })).toMatchObject({ ok: false }));

    it("carries a title and place into meta", () => {
      const r = validatePost({ ...base, title: "Big news", place: "Nagpur" });
      if (r.ok) expect(r.meta).toMatchObject({ title: "Big news", place: "Nagpur" });
    });

    it("defaults audience to everyone and honours followers", () => {
      expect(validatePost(base)).toMatchObject({ audience: "everyone" });
      expect(validatePost({ ...base, audience: "followers" })).toMatchObject({ audience: "followers" });
      expect(validatePost({ ...base, audience: "nonsense" })).toMatchObject({ audience: "everyone" });
    });

    it("encodes draft / scheduled / now via publishAt", () => {
      expect(validatePost({ ...base, saveDraft: true })).toMatchObject({ publishAt: null });
      const r = validatePost({ ...base, publishAt: future });
      if (r.ok) expect(typeof r.publishAt).toBe("string");
      expect(validatePost(base)).toMatchObject({ publishAt: undefined });
    });
    it("rejects a scheduled time in the past", () =>
      expect(validatePost({ ...base, publishAt: past })).toMatchObject({ ok: false }));
  });
});
