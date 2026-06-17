import { describe, it, expect } from "vitest";
import { parseVideoUrl } from "./video";

describe("parseVideoUrl", () => {
  it("parses a youtube watch url", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
  });
  it("parses youtu.be short links and shorts", () => {
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
    expect(parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.videoId).toBe("dQw4w9WgXcQ");
  });
  it("parses a vimeo url", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789")).toEqual({
      provider: "vimeo",
      videoId: "123456789",
      embedUrl: "https://player.vimeo.com/video/123456789",
    });
  });
  it("returns null for junk", () => {
    expect(parseVideoUrl("https://example.com/not-a-video")).toBeNull();
    expect(parseVideoUrl("")).toBeNull();
  });
});
