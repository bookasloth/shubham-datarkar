import { describe, it, expect, vi, afterEach } from "vitest";
import { youtubeEmbeddable } from "./youtube-embed";

const ID = "dQw4w9WgXcQ";

afterEach(() => vi.restoreAllMocks());

function mockFetch(impl: () => Promise<Response> | never) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("youtubeEmbeddable", () => {
  it("allows a video oEmbed returns 200 for", async () => {
    mockFetch(async () => new Response("{}", { status: 200 }));
    expect(await youtubeEmbeddable(ID)).toBe(true);
  });

  it("blocks a video whose owner disabled embedding (401)", async () => {
    mockFetch(async () => new Response("", { status: 401 }));
    expect(await youtubeEmbeddable(ID)).toBe(false);
  });

  it("blocks a private/removed video (404)", async () => {
    mockFetch(async () => new Response("", { status: 404 }));
    expect(await youtubeEmbeddable(ID)).toBe(false);
  });

  it("fails OPEN on a network error — a flaky check must not block a good post", async () => {
    mockFetch(() => {
      throw new Error("network down");
    });
    expect(await youtubeEmbeddable(ID)).toBe(true);
  });

  it("skips the check (allows) for a malformed id without calling out", async () => {
    const spy = vi.fn(async () => new Response("", { status: 401 }));
    vi.stubGlobal("fetch", spy);
    expect(await youtubeEmbeddable("not-an-id")).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });
});
