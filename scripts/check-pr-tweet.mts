/**
 * CI gate: an announce-worthy PR must carry its own `Tweet:` line.
 *
 * Runs on Node's native type stripping — no build, no `npm ci`. That only works
 * because `pr.ts` is dependency-free, which is also why this can import the very
 * functions the merge webhook uses: the check and the thing it checks cannot
 * disagree about what "announce-worthy" means.
 *
 * The PR fields arrive through the environment, never interpolated into a shell
 * command — a title is attacker-controlled text, and `${{ }}` inside a `run:`
 * would be a script-injection hole.
 */
import { missingTweet, parsePrTitle } from "../src/lib/community/auto/pr.ts";

const title = process.env.PR_TITLE ?? "";
const body = process.env.PR_BODY ?? "";

let labels: string[] = [];
try {
  const parsed: unknown = JSON.parse(process.env.PR_LABELS ?? "[]");
  if (Array.isArray(parsed)) labels = parsed.filter((l): l is string => typeof l === "string");
} catch {
  // A malformed label payload means "no labels", which can only make the check
  // stricter (no-announce is a kill switch) — never wrongly waive it.
}

if (!missingTweet(title, labels, body)) {
  const { type } = parsePrTitle(title);
  console.log(`OK — ${type ? `${type}: ` : ""}this PR either carries a Tweet: line or never announces.`);
  process.exit(0);
}

console.error(
  [
    "",
    `This PR announces to /community on merge, but has no Tweet: line.`,
    "",
    `  Title: ${title}`,
    "",
    "Without one the fallback pool picks the wording. It is ~14 lines, so a",
    "miss is a coin-flip on the feed posting the same sentence twice under the",
    "owner's name — which is exactly what happened on #221 and #222.",
    "",
    "Add ONE line anywhere in the PR body, written for a reader, not a reviewer:",
    "",
    "  Tweet: <what a stranger scrolling past should read>",
    "",
    "See docs/PR-TWEET.md — read the PR, write five, ship one.",
    "",
    "If this genuinely has nothing to say in public, label it `no-announce`",
    "and nothing posts at all.",
    "",
  ].join("\n"),
);
process.exit(1);
