import { describe, it, expect } from "vitest";
import { escapeXml, truncate, renderBadge } from "./render";

describe("badge/render", () => {
  it("escapes all XML-significant characters", () => {
    expect(escapeXml(`<a>&"'`)).toBe("&lt;a&gt;&amp;&quot;&#39;");
  });

  it("truncates long values with an ellipsis, keeping the cap", () => {
    const out = truncate("x".repeat(60), 42);
    expect(out.length).toBeLessThanOrEqual(42);
    expect(out.endsWith("…")).toBe(true);
    expect(truncate("short", 42)).toBe("short");
  });

  it("renders a self-contained SVG with escaped label and value", () => {
    const svg = renderBadge({ label: "Latest post", value: "Hello & Welcome" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("LATEST POST");
    expect(svg).toContain("Hello &amp; Welcome");
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("cannot be broken out of via a malicious value (no raw </svg> injected)", () => {
    const svg = renderBadge({ label: "x", value: "</svg><script>alert(1)</script>" });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;/svg&gt;");
    // exactly one real closing tag — the one we control
    expect(svg.match(/<\/svg>/g)).toHaveLength(1);
  });

  it("widens for longer values", () => {
    const narrow = renderBadge({ label: "n", value: "3" });
    const wide = renderBadge({ label: "n", value: "a much longer value here" });
    const w = (s: string) => Number(s.match(/width="(\d+)"/)![1]);
    expect(w(wide)).toBeGreaterThan(w(narrow));
  });
});
