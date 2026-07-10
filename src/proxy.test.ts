import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ hasUser: true }));

// getUser() rotating a refresh token = the client calling setAll() mid-request.
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll: (
          cookies: { name: string; value: string; options?: object }[],
        ) => void;
      };
    },
  ) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([
          { name: "sb-auth-token", value: "rotated", options: { path: "/" } },
        ]);
        return { data: { user: state.hasUser ? { id: "u1" } : null } };
      },
    },
  }),
}));

const { proxy } = await import("@/proxy");

const run = (path: string, hasUser: boolean) => {
  state.hasUser = hasUser;
  return proxy(new NextRequest(new URL(`https://example.test${path}`)));
};

describe("proxy", () => {
  it.each([
    ["/admin", false, "/login"],
    ["/games/login", true, "/games"],
    ["/members/login", true, "/members"],
  ])("%s carries rotated auth cookies onto the redirect", async (
    path,
    hasUser,
    destination,
  ) => {
    const response = await run(path, hasUser);

    expect(response.headers.get("location")).toContain(destination);
    expect(response.cookies.get("sb-auth-token")?.value).toBe("rotated");
  });

  it("carries rotated auth cookies on a pass-through", async () => {
    const response = await run("/admin", true);

    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("sb-auth-token")?.value).toBe("rotated");
  });
});
