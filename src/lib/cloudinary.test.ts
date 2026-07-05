import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const destroyMock = vi.fn();
const configMock = vi.fn();

vi.mock("cloudinary", () => ({
  v2: {
    config: configMock,
    uploader: {
      destroy: destroyMock,
    },
  },
}));

beforeEach(() => {
  vi.resetModules();
  destroyMock.mockReset();
  configMock.mockReset();
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo-cloud";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";
});

describe("deleteCloudinaryAsset", () => {
  it("returns ok:true when Cloudinary reports result: ok", async () => {
    destroyMock.mockResolvedValue({ result: "ok" });
    const { deleteCloudinaryAsset } = await import("./cloudinary");

    const res = await deleteCloudinaryAsset("gallery/photo-1");

    expect(res).toEqual({ ok: true });
    expect(destroyMock).toHaveBeenCalledWith("gallery/photo-1");
  });

  it("treats result: not found as success (already deleted)", async () => {
    destroyMock.mockResolvedValue({ result: "not found" });
    const { deleteCloudinaryAsset } = await import("./cloudinary");

    const res = await deleteCloudinaryAsset("gallery/missing");

    expect(res).toEqual({ ok: true });
  });

  it("returns ok:false with a message for an unexpected result", async () => {
    destroyMock.mockResolvedValue({ result: "denied" });
    const { deleteCloudinaryAsset } = await import("./cloudinary");

    const res = await deleteCloudinaryAsset("gallery/photo-2");

    expect(res.ok).toBe(false);
  });

  it("returns ok:false when the SDK call throws", async () => {
    destroyMock.mockRejectedValue(new Error("network down"));
    const { deleteCloudinaryAsset } = await import("./cloudinary");

    const res = await deleteCloudinaryAsset("gallery/photo-3");

    expect(res).toEqual({ ok: false, error: "network down" });
  });

  it("throws a clear error when required env vars are missing", async () => {
    delete process.env.CLOUDINARY_API_SECRET;
    const { deleteCloudinaryAsset } = await import("./cloudinary");

    await expect(deleteCloudinaryAsset("gallery/photo-4")).rejects.toThrow(
      "Missing CLOUDINARY_API_SECRET"
    );
  });
});
