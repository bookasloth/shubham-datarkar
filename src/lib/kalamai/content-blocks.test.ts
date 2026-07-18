import { describe, expect, it, vi } from "vitest";
import { parseContentBlocks, parseWithRepair, ContentBlockParseError, KalamaiHardFailure } from "./content-blocks";

describe("parseContentBlocks", () => {
  it("returns a valid block array unchanged", () => {
    const raw = JSON.stringify([
      { type: "h2", text: "Heading" },
      { type: "p", text: "A paragraph." },
      { type: "ul", items: ["one", "two"] },
    ]);
    const blocks = parseContentBlocks(raw);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: "h2", text: "Heading" });
  });

  it("drops junk blocks instead of rejecting the whole array", () => {
    const raw = JSON.stringify([
      { type: "h2", text: "Kept" },
      { type: "notARealBlock", text: "unknown type" }, // unknown discriminant
      { type: "p" }, // missing required `text`
      { type: "table", columns: ["a"], rows: [["1"]] }, // valid
      "a bare string", // not an object
      { text: "no type field" }, // missing discriminant
    ]);
    const blocks = parseContentBlocks(raw);
    expect(blocks.map((b) => b.type)).toEqual(["h2", "table"]);
  });

  it("strips a ```json code fence the model wrapped the array in", () => {
    const raw = "```json\n" + JSON.stringify([{ type: "p", text: "hi" }]) + "\n```";
    expect(parseContentBlocks(raw)).toEqual([{ type: "p", text: "hi" }]);
  });

  it("salvages the array when the article text itself contains a ``` fence", () => {
    // The lazy stripFence regex mis-matches on an inner fence; salvage by [ … ] span.
    const raw = "```json\n" + JSON.stringify([{ type: "p", text: "use a ```json block for schema" }]) + "\n```";
    expect(parseContentBlocks(raw)).toEqual([{ type: "p", text: "use a ```json block for schema" }]);
  });

  it("salvages the array despite a prose preamble before it", () => {
    const raw = "Here is the article:\n" + JSON.stringify([{ type: "p", text: "hi" }]);
    expect(parseContentBlocks(raw)).toEqual([{ type: "p", text: "hi" }]);
  });

  it("throws ContentBlockParseError on unparseable JSON", () => {
    expect(() => parseContentBlocks("{not json")).toThrow(ContentBlockParseError);
  });

  it("throws ContentBlockParseError when the top level is not an array", () => {
    expect(() => parseContentBlocks(JSON.stringify({ type: "p", text: "x" }))).toThrow(ContentBlockParseError);
  });
});

describe("parseWithRepair", () => {
  const good = JSON.stringify([{ type: "p", text: "ok" }]);

  it("parses valid output without calling repair", async () => {
    const repair = vi.fn();
    const blocks = await parseWithRepair(good, repair);
    expect(blocks).toHaveLength(1);
    expect(repair).not.toHaveBeenCalled();
  });

  it("repairs once when the first output is unparseable", async () => {
    const repair = vi.fn().mockResolvedValue(good);
    const blocks = await parseWithRepair("{garbage", repair);
    expect(blocks).toHaveLength(1);
    expect(repair).toHaveBeenCalledOnce();
  });

  it("throws KalamaiHardFailure when the repair is also unparseable", async () => {
    const repair = vi.fn().mockResolvedValue("still garbage");
    await expect(parseWithRepair("{garbage", repair)).rejects.toThrow(KalamaiHardFailure);
    expect(repair).toHaveBeenCalledOnce();
  });
});
