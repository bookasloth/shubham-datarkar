import { describe, it, expect } from "vitest";
import { detectPlatform, isValidPlaylistUrl, toEmbedUrl, slugify } from "./types";

describe("detectPlatform", () => {
  it("maps known hosts", () => {
    expect(detectPlatform("https://open.spotify.com/playlist/37i9dQ")).toBe("spotify");
    expect(detectPlatform("https://music.apple.com/us/playlist/x/pl.123")).toBe("apple_music");
    expect(detectPlatform("https://www.youtube.com/playlist?list=PL123")).toBe("youtube");
    expect(detectPlatform("https://music.youtube.com/playlist?list=PL123")).toBe("youtube");
    expect(detectPlatform("https://soundcloud.com/user/sets/x")).toBe("soundcloud");
  });
  it("falls back to other for unknown or garbage", () => {
    expect(detectPlatform("https://example.com/mix")).toBe("other");
    expect(detectPlatform("not a url")).toBe("other");
  });
});

describe("isValidPlaylistUrl", () => {
  it("requires http(s)", () => {
    expect(isValidPlaylistUrl("ftp://x.com")).toBe(false);
    expect(isValidPlaylistUrl("javascript:alert(1)")).toBe(false);
    expect(isValidPlaylistUrl("nope")).toBe(false);
  });
  it("enforces host↔platform match, any host for other", () => {
    expect(isValidPlaylistUrl("https://open.spotify.com/playlist/1", "spotify")).toBe(true);
    expect(isValidPlaylistUrl("https://youtube.com/playlist?list=1", "spotify")).toBe(false);
    expect(isValidPlaylistUrl("https://anything.dev/x", "other")).toBe(true);
    expect(isValidPlaylistUrl("https://anything.dev/x")).toBe(true);
  });
});

describe("toEmbedUrl", () => {
  it("derives supported embeds, null otherwise", () => {
    expect(toEmbedUrl("spotify", "https://open.spotify.com/playlist/ABC")).toBe(
      "https://open.spotify.com/embed/playlist/ABC",
    );
    expect(toEmbedUrl("youtube", "https://www.youtube.com/playlist?list=PL9")).toBe(
      "https://www.youtube-nocookie.com/embed/videoseries?list=PL9",
    );
    expect(toEmbedUrl("apple_music", "https://music.apple.com/us/playlist/x/pl.9")).toBe(
      "https://embed.music.apple.com/us/playlist/x/pl.9",
    );
    expect(toEmbedUrl("soundcloud", "https://soundcloud.com/x/sets/y")).toBeNull();
    expect(toEmbedUrl("youtube", "https://youtu.be/watch")).toBeNull(); // no list param
  });
});

describe("slugify", () => {
  it("normalizes and never returns empty", () => {
    expect(slugify("Late Night Drive")).toBe("late-night-drive");
    expect(slugify("!!!")).toBe("playlist");
  });
});
