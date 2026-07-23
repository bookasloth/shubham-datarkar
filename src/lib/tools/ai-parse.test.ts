import { describe, it, expect } from "vitest";
import { parseAnalysis, extractJson } from "./ai-parse";

describe("ai-parse", () => {
  it("pulls JSON out of surrounding prose", () => {
    const raw = 'Here is my analysis:\n{"score": 82, "summary": "Strong.", "checks": [], "suggestions": []}\nHope that helps!';
    expect(parseAnalysis(raw).score).toBe(82);
  });

  it("clamps score and defaults missing fields", () => {
    const r = parseAnalysis('{"score": 250}');
    expect(r.score).toBe(100);
    expect(r.summary).toBe("");
    expect(r.checks).toEqual([]);
    expect(r.suggestions).toEqual([]);
  });

  it("normalizes verdicts and drops malformed checks", () => {
    const r = parseAnalysis(
      '{"score": 40, "checks": [{"label":"Clarity","verdict":"good"},{"label":"Hook","verdict":"weak"},{"nope":1}], "suggestions":["fix it", 5]}',
    );
    expect(r.checks).toEqual([
      { label: "Clarity", verdict: "good" },
      { label: "Hook", verdict: "improve" }, // anything not "good" → improve
    ]);
    expect(r.suggestions).toEqual(["fix it"]); // non-strings dropped
  });

  it("throws when there is no JSON object", () => {
    expect(() => extractJson("sorry, I can't")).toThrow();
  });
});
