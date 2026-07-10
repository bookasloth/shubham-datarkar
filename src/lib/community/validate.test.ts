import { describe, it, expect } from "vitest";
import { validatePost } from "./validate";

const base = { type: "text", body: "hello", imageCount: 0, youtubeUrl: "" };

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
});
