import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Swappable per test — resolveKalamaiRole reads profiles; checkAndConsume calls the rpc.
let mockDb: unknown;
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: () => mockDb,
}));

import { resolveKalamaiRole, checkAndConsume, type ConsumeOutcome } from "./quota-server";
import type { MemberContext } from "@/lib/members/session";

beforeEach(() => {
  mockDb = undefined;
});

function ctx(partial: Partial<MemberContext>): MemberContext {
  return {
    user: null,
    role: "guest",
    membership: null,
    capabilities: new Set<string>(),
    ...partial,
  } as MemberContext;
}

/** Mock that answers only the profiles.is_founder read. */
function profilesDb(isFounder: boolean | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: isFounder === null ? null : { is_founder: isFounder },
            error: null,
          }),
        }),
      }),
    }),
  };
}

/** Mock that answers only the consume rpc; captures the params it was called with. */
function rpcDb(
  row: { id: string | null; outcome: ConsumeOutcome } | null,
  opts: { error?: string; capture?: (params: Record<string, unknown>) => void } = {},
) {
  return {
    rpc: async (_name: string, params: Record<string, unknown>) => {
      opts.capture?.(params);
      return { data: row ? [row] : null, error: opts.error ? { message: opts.error } : null };
    },
  };
}

describe("resolveKalamaiRole", () => {
  it("returns guest for a signed-out context without touching the db", async () => {
    expect(await resolveKalamaiRole(ctx({ user: null }))).toBe("guest");
  });

  it("returns admin when the context role is admin", async () => {
    const c = ctx({ user: { id: "u1" }, role: "admin" } as Partial<MemberContext>);
    expect(await resolveKalamaiRole(c)).toBe("admin");
  });

  it("returns founder when profiles.is_founder is true, outranking premium", async () => {
    mockDb = profilesDb(true);
    const c = ctx({ user: { id: "u1" }, role: "member", capabilities: new Set(["use_kalamai"]) } as Partial<MemberContext>);
    expect(await resolveKalamaiRole(c)).toBe("founder");
  });

  it("returns premium when the use_kalamai capability is held and not a founder", async () => {
    mockDb = profilesDb(false);
    const c = ctx({ user: { id: "u1" }, role: "premium", capabilities: new Set(["use_kalamai"]) } as Partial<MemberContext>);
    expect(await resolveKalamaiRole(c)).toBe("premium");
  });

  it("returns member for a signed-in non-payer (no capability, not founder)", async () => {
    mockDb = profilesDb(false);
    const c = ctx({ user: { id: "u1" }, role: "member", capabilities: new Set() } as Partial<MemberContext>);
    expect(await resolveKalamaiRole(c)).toBe("member");
  });
});

describe("checkAndConsume", () => {
  const outcomes: ConsumeOutcome[] = [
    "created",
    "deduped",
    "quota_exceeded",
    "too_many_concurrent",
    "rate_limited",
  ];

  for (const outcome of outcomes) {
    it(`maps the '${outcome}' rpc row through`, async () => {
      mockDb = rpcDb({ id: outcome === "created" || outcome === "deduped" ? "a1" : null, outcome });
      const res = await checkAndConsume({ userId: "u1", role: "member", kind: "analysis" });
      expect(res.outcome).toBe(outcome);
      if (outcome === "created" || outcome === "deduped") expect(res.id).toBe("a1");
      else expect(res.id).toBeNull();
    });
  }

  it("forwards params and defaults missing ones to null", async () => {
    let seen: Record<string, unknown> | undefined;
    mockDb = rpcDb({ id: "a1", outcome: "created" }, { capture: (p) => (seen = p) });
    await checkAndConsume({ userId: "u1", role: "premium", kind: "analysis", keyword: "seo nagpur" });
    expect(seen).toMatchObject({
      p_user: "u1",
      p_role: "premium",
      p_kind: "analysis",
      p_keyword: "seo nagpur",
      p_country: null,
      p_locale: null,
      p_analysis_id: null,
    });
  });

  it("throws when the rpc returns an error", async () => {
    mockDb = rpcDb(null, { error: "boom" });
    await expect(checkAndConsume({ userId: "u1", role: "member", kind: "article" })).rejects.toThrow(/boom/);
  });
});
