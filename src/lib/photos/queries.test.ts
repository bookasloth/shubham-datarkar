import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mapRow } from "./queries";

describe("mapRow", () => {
  it("maps a full db row (snake_case) to a Photo (camelCase)", () => {
    const row = {
      id: "11111111-1111-1111-1111-111111111111",
      cloudinary_public_id: "gallery/sunset",
      title: "Sunset",
      description: "A sunset over the hills",
      tags: ["nature", "sunset"],
      sort_order: 3,
      published: true,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-02T00:00:00.000Z",
    };

    expect(mapRow(row)).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      cloudinaryPublicId: "gallery/sunset",
      title: "Sunset",
      description: "A sunset over the hills",
      tags: ["nature", "sunset"],
      sortOrder: 3,
      published: true,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-02T00:00:00.000Z",
    });
  });

  it("defaults null description to null and null tags to an empty array", () => {
    const row = {
      id: "22222222-2222-2222-2222-222222222222",
      cloudinary_public_id: "gallery/mountain",
      title: "Mountain",
      description: null,
      tags: null,
      sort_order: 0,
      published: false,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    };

    const photo = mapRow(row);
    expect(photo.description).toBeNull();
    expect(photo.tags).toEqual([]);
  });
});
