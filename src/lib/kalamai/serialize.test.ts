import { describe, expect, it } from "vitest";
import type { ContentBlock } from "@/lib/data/types";
import { blocksToMarkdown, blocksToHtml } from "./serialize";

const blocks: ContentBlock[] = [
  { type: "h2", text: "Services" },
  { type: "p", text: ["We offer ", { t: "b", text: "SEO" }, " and ", { t: "a", text: "PPC", href: "/ppc" }, "."] },
  { type: "ul", items: ["Local SEO", "Content"] },
  { type: "quote", text: "Data beats opinion." },
  { type: "code", code: "npm i", lang: "bash" },
  { type: "table", columns: ["Plan", "Price"], rows: [["Basic", "₹5k"]] },
  { type: "faq", items: [{ q: "How much?", a: "It depends." }] },
];

describe("blocksToMarkdown", () => {
  it("renders headings, inline marks, lists, quote, code, table", () => {
    const md = blocksToMarkdown(blocks);
    expect(md).toContain("## Services");
    expect(md).toContain("We offer **SEO** and [PPC](/ppc).");
    expect(md).toContain("- Local SEO");
    expect(md).toContain("> Data beats opinion.");
    expect(md).toContain("```bash\nnpm i\n```");
    expect(md).toContain("| Plan | Price |");
    expect(md).toContain("| Basic | ₹5k |");
    expect(md).toContain("**How much?**");
  });

  it("skips unknown block types instead of throwing", () => {
    const md = blocksToMarkdown([{ type: "pricing" }, { type: "h2", text: "Kept" }]);
    expect(md.trim()).toBe("## Kept");
  });
});

describe("blocksToHtml", () => {
  it("renders semantic HTML with escaped inline marks", () => {
    const html = blocksToHtml(blocks);
    expect(html).toContain("<h2>Services</h2>");
    expect(html).toContain('We offer <strong>SEO</strong> and <a href="/ppc">PPC</a>.');
    expect(html).toContain("<li>Local SEO</li>");
    expect(html).toContain("<blockquote>Data beats opinion.</blockquote>");
    expect(html).toContain("<th>Plan</th>");
  });

  it("escapes HTML-special characters in text", () => {
    const html = blocksToHtml([{ type: "p", text: "a < b & c" }]);
    expect(html).toContain("a &lt; b &amp; c");
  });
});
