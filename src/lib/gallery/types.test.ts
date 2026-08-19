import { describe, it, expect } from "vitest";
import { mapGalleryRow, slugify, type GalleryRow } from "./types";

const row: GalleryRow = {
  id: "abc",
  album_id: null,
  caption: null,
  description: null,
  location: null,
  photographer: null,
  image_url: "https://x.supabase.co/storage/v1/object/public/gallery/2026/08/a.webp",
  width: 1200,
  height: 800,
  is_published: true,
  display_order: 3,
  created_at: "2026-08-19T00:00:00Z",
};

describe("mapGalleryRow", () => {
  it("coalesces a null caption to empty string, keeps other nulls", () => {
    const m = mapGalleryRow(row);
    expect(m.caption).toBe("");
    expect(m.description).toBeNull();
    expect(m.albumId).toBeNull();
    expect(m.imageUrl).toBe(row.image_url);
    expect(m.width).toBe(1200);
    expect(m.isPublished).toBe(true);
  });

  it("passes album_id through", () => {
    expect(mapGalleryRow({ ...row, album_id: "album-1" }).albumId).toBe("album-1");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Virat Kohli Wallpaper")).toBe("virat-kohli-wallpaper");
  });
  it("strips punctuation and collapses separators, no leading/trailing dashes", () => {
    expect(slugify("  Hello, World!!  ")).toBe("hello-world");
  });
  it("falls back to 'album' when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("album");
  });
});
