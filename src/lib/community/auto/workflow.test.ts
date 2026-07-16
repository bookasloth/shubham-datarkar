import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";

/**
 * The workflow file is the one thing here that no other test covers and that
 * fails *open*: invalid YAML doesn't error loudly, it just means the check never
 * runs — a gate that silently isn't there. That already happened once, on this
 * very file (an unquoted colon in a step name), so it gets pinned.
 */
const PATH = ".github/workflows/pr-tweet.yml";

type Workflow = {
  name: string;
  on: { pull_request: { types: string[] } };
  jobs: Record<string, { steps: { name?: string; run?: string; env?: Record<string, string> }[] }>;
};

const wf = load(readFileSync(PATH, "utf8")) as Workflow;

describe("pr-tweet workflow", () => {
  it("is valid YAML with a real name", () => {
    // A parse failure shows up in GitHub as the file path instead of the name.
    expect(wf.name).toBe("PR tweet");
  });

  it("re-runs when the body or labels change, not just on open", () => {
    // Adding the Tweet: line, or reaching for no-announce, must clear the check
    // without an empty commit to trigger it.
    expect(wf.on.pull_request.types).toEqual(
      expect.arrayContaining(["opened", "edited", "labeled", "unlabeled"]),
    );
  });

  it("runs the checker", () => {
    const runs = wf.jobs["tweet-line"].steps.map((s) => s.run ?? "").join("\n");
    expect(runs).toContain("scripts/check-pr-tweet.mts");
  });

  it("passes PR text through env, never interpolated into the shell", () => {
    // ${{ }} inside a run: is a script-injection hole — a PR title is text an
    // attacker chooses.
    const step = wf.jobs["tweet-line"].steps.find((s) => s.run?.includes("check-pr-tweet"));
    expect(step?.env?.PR_TITLE).toContain("github.event.pull_request.title");
    expect(step?.run).not.toContain("${{");
  });
});
