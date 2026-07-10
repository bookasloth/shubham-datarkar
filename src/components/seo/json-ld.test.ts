import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "@/components/seo/json-ld";

describe("serializeJsonLd", () => {
  it("escapes < so a schema value cannot close the script element", () => {
    const out = serializeJsonLd({
      "@type": "Review",
      reviewBody: 'Loved it!</script><img src=x onerror=alert(1)>',
    });

    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script>");
  });

  it("escapes uppercase and whitespace variants of the closing tag too", () => {
    const out = serializeJsonLd([{ reviewBody: "</ScRiPt\n>" }]);

    expect(out).not.toMatch(/<\/\s*script/i);
  });

  it("keeps the payload semantically identical for consumers", () => {
    const data = { reviewBody: "a < b, and </script> is fine" };

    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});
