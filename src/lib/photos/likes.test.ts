import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { isLiked, toggleLike, getLikedSet, LIKES_KEY } from "./likes";

/**
 * A minimal in-memory localStorage mock. The like-store runs in the browser,
 * but vitest's environment here is `node` — so we install a fake `window` with
 * just the `localStorage` surface the store touches.
 */
function installStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  vi.stubGlobal("window", { localStorage });
  vi.stubGlobal("localStorage", localStorage);
  return store;
}

describe("likes store", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("with storage available", () => {
    beforeEach(() => {
      installStorage();
    });

    it("reports not-liked for an unknown id", () => {
      expect(isLiked("a")).toBe(false);
    });

    it("toggleLike likes then unlikes, returning the new state", () => {
      expect(toggleLike("a")).toBe(true);
      expect(isLiked("a")).toBe(true);
      expect(toggleLike("a")).toBe(false);
      expect(isLiked("a")).toBe(false);
    });

    it("persists multiple likes independently", () => {
      toggleLike("a");
      toggleLike("b");
      expect(isLiked("a")).toBe(true);
      expect(isLiked("b")).toBe(true);
      expect(isLiked("c")).toBe(false);
    });

    it("getLikedSet returns all liked ids as a Set", () => {
      toggleLike("a");
      toggleLike("b");
      const set = getLikedSet();
      expect(set).toBeInstanceOf(Set);
      expect(set.has("a")).toBe(true);
      expect(set.has("b")).toBe(true);
      expect(set.size).toBe(2);
    });

    it("writes to the documented storage key", () => {
      const store = installStorage();
      toggleLike("a");
      expect(store.has(LIKES_KEY)).toBe(true);
      expect(JSON.parse(store.get(LIKES_KEY)!)).toContain("a");
    });

    it("survives corrupt JSON in storage", () => {
      installStorage({ [LIKES_KEY]: "not-json{" });
      expect(getLikedSet().size).toBe(0);
      expect(isLiked("a")).toBe(false);
      expect(toggleLike("a")).toBe(true);
    });

    it("ignores a non-array JSON payload", () => {
      installStorage({ [LIKES_KEY]: '{"a":true}' });
      expect(getLikedSet().size).toBe(0);
    });
  });

  describe("SSR-safe (no window)", () => {
    beforeEach(() => {
      vi.stubGlobal("window", undefined);
    });

    it("isLiked returns false without throwing", () => {
      expect(isLiked("a")).toBe(false);
    });

    it("getLikedSet returns an empty set", () => {
      expect(getLikedSet().size).toBe(0);
    });

    it("toggleLike is a no-op that reports liked-intent", () => {
      // No storage to persist to; it must not throw. Returns the intended
      // next state (true) so a component optimistic-updates gracefully.
      expect(() => toggleLike("a")).not.toThrow();
      expect(toggleLike("a")).toBe(true);
    });
  });
});
