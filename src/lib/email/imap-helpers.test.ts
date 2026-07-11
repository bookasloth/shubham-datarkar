import { describe, it, expect } from "vitest";
import {
  imapHostFromSmtp,
  buildReplySubject,
  buildReferences,
  escapeHtml,
  sanitizeEmailHtml,
} from "./imap-helpers";

describe("imapHostFromSmtp", () => {
  it("swaps smtp. prefix for imap.", () => {
    expect(imapHostFromSmtp("smtp.hostinger.com")).toBe("imap.hostinger.com");
    expect(imapHostFromSmtp("smtp.gmail.com")).toBe("imap.gmail.com");
  });
  it("passes through hosts without the smtp. prefix", () => {
    expect(imapHostFromSmtp("mail.example.com")).toBe("mail.example.com");
  });
});

describe("buildReplySubject", () => {
  it("prefixes Re: when absent", () => {
    expect(buildReplySubject("Hello")).toBe("Re: Hello");
  });
  it("does not double-prefix (any case)", () => {
    expect(buildReplySubject("Re: Hello")).toBe("Re: Hello");
    expect(buildReplySubject("RE: Hello")).toBe("RE: Hello");
  });
  it("handles empty subject", () => {
    expect(buildReplySubject("")).toBe("Re: ");
  });
});

describe("buildReferences", () => {
  it("chains existing references then the message id", () => {
    expect(buildReferences("<a@x>", "<b@x>")).toBe("<a@x> <b@x>");
  });
  it("drops missing parts", () => {
    expect(buildReferences(undefined, "<b@x>")).toBe("<b@x>");
    expect(buildReferences("<a@x>", undefined)).toBe("<a@x>");
    expect(buildReferences(undefined, undefined)).toBe("");
  });
});

describe("escapeHtml", () => {
  it("escapes the dangerous five", () => {
    expect(escapeHtml(`<b>&"'`)).toBe("&lt;b&gt;&amp;&quot;&#39;");
  });
});

describe("sanitizeEmailHtml", () => {
  it("strips script tags and event handlers", () => {
    const out = sanitizeEmailHtml(`<p onclick="x()">hi</p><script>alert(1)</script>`);
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).toContain("hi");
  });
  it("blocks remote images by default, keeps the original url in data-blocked-src", () => {
    const out = sanitizeEmailHtml(`<img src="https://track.er/pixel.gif">`);
    expect(out).toContain('data-blocked-src="https://track.er/pixel.gif"');
    // real src (space-preceded) must be gone; data-blocked-src (dash) is fine
    expect(out).not.toMatch(/[^-]src="https:\/\/track\.er/);
  });
  it("allows remote images when explicitly opted in", () => {
    const out = sanitizeEmailHtml(`<img src="https://ok.com/a.png">`, true);
    expect(out).toContain('src="https://ok.com/a.png"');
  });
});
