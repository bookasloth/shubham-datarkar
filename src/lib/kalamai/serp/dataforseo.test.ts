import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseDataForSeo } from "./dataforseo";

describe("parseDataForSeo", () => {
  it("throws on a task-level error (HTTP 200 but non-20000 status)", () => {
    const paused = { tasks: [{ status_code: 40201, status_message: "account paused", result: null }] };
    expect(() => parseDataForSeo(paused)).toThrow(/40201/);
  });

  it("returns empty result for a successful task with no items", () => {
    const ok = { tasks: [{ status_code: 20000, status_message: "Ok.", result: [{ items: [] }] }] };
    expect(parseDataForSeo(ok)).toEqual({ organic: [], paa: [], aiOverviewUrls: [] });
  });

  it("parses organic + paa on a good response", () => {
    const json = {
      tasks: [
        {
          status_code: 20000,
          result: [
            {
              items: [
                { type: "organic", url: "https://a.com", rank_absolute: 2, title: "A" },
                { type: "organic", url: "https://b.com", rank_absolute: 1, title: "B" },
                { type: "people_also_ask", items: [{ title: "why?" }] },
              ],
            },
          ],
        },
      ],
    };
    const r = parseDataForSeo(json);
    expect(r.organic.map((o) => o.url)).toEqual(["https://b.com", "https://a.com"]); // rank-sorted
    expect(r.paa).toEqual(["why?"]);
  });
});
