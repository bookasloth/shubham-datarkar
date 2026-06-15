// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { htmlToNodes, nodesToHtml, normalize } from "./rich-text-serialize";
import type { InlineNode } from "@/lib/data/types";

const roundtrip = (nodes: InlineNode[]) => normalize(htmlToNodes(nodesToHtml(nodes)));

describe("rich-text-serialize", () => {
  it("round-trips plain text", () => {
    expect(roundtrip(["hello world"])).toEqual(["hello world"]);
  });
  it("round-trips simple wraps", () => {
    const n: InlineNode[] = ["a ", { t: "b", text: "bold" }, " and ", { t: "code", text: "x" }];
    expect(roundtrip(n)).toEqual(n);
  });
  it("round-trips a link with href", () => {
    const n: InlineNode[] = ["see ", { t: "a", text: "docs", href: "/docs" }];
    expect(roundtrip(n)).toEqual(n);
  });
  it("round-trips tooltip, popover and footnote", () => {
    const n: InlineNode[] = [
      { t: "tooltip", text: "term", tip: "definition" },
      { t: "popover", text: "more", content: "details" },
      { t: "fn", n: 3 },
    ];
    expect(roundtrip(n)).toEqual(n);
  });
  it("normalize merges adjacent plain strings and drops empties", () => {
    expect(normalize(["a", "", "b"])).toEqual(["ab"]);
  });
});
