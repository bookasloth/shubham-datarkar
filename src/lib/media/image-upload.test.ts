import { describe, it, expect } from "vitest";
import { validateImageFile, imageExt, MAX_IMAGE_BYTES } from "./image-upload";

function fileOf(type: string, bytes: number, name = "x.jpg"): File {
  const blob = new Blob([new Uint8Array(bytes)], { type });
  return new File([blob], name, { type });
}

describe("validateImageFile", () => {
  it("accepts a small jpeg", () => {
    expect(validateImageFile(fileOf("image/jpeg", 10))).toBeNull();
  });
  it("rejects svg (stored-XSS risk)", () => {
    expect(validateImageFile(fileOf("image/svg+xml", 10, "x.svg"))).toMatch(/JPG|PNG|WebP|GIF|AVIF/);
  });
  it("rejects a file over the size cap", () => {
    expect(validateImageFile(fileOf("image/png", MAX_IMAGE_BYTES + 1, "x.png"))).toMatch(/5MB/);
  });
});

describe("imageExt", () => {
  it("lowercases and strips", () => {
    expect(imageExt(new File([], "PHOTO.JPEG"))).toBe("jpeg");
  });
  it("falls back to bin when extensionless", () => {
    expect(imageExt(new File([], "photo"))).toBe("bin");
  });
});
