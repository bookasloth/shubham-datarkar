/**
 * Conventional-commit parsing + the "is this PR worth announcing" heuristic.
 * Pure — unit-testable directly. Announce feat/fix/perf/chore; skip noise
 * scopes; a `no-announce` label is a hard kill switch.
 */
const ANNOUNCE_TYPES = new Set(["feat", "fix", "perf", "chore"]);
const SKIP_SCOPES = new Set(["deps", "ci", "build", "test", "docs", "refactor", "style"]);

/**
 * Repos allowed to auto-post, mapped to the project name used in the copy.
 * Allowlist, not just a lookup: a repo absent here can never post, so a leaked
 * webhook secret alone is not enough to write to the public feed.
 */
// Map, not an object literal: a plain-object lookup returns inherited members
// for keys like "constructor", which would read as an allowlist hit.
const PR_REPOS = new Map<string, string>([
  ["bookasloth/shubham-datarkar", "the site"],
  ["bookasloth/book-a-sloth", "Book A Sloth"],
]);

/** Project label for an allowlisted repo `full_name`, or null if not allowed. */
export function projectFor(repoFullName: string | null | undefined): string | null {
  return PR_REPOS.get((repoFullName ?? "").toLowerCase()) ?? null;
}

export function parsePrTitle(title: string): { type: string | null; scope: string | null; subject: string } {
  const m = title.trim().match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/);
  if (!m) return { type: null, scope: null, subject: title.trim() };
  return { type: m[1].toLowerCase(), scope: m[2] ? m[2].toLowerCase() : null, subject: m[3].trim() };
}

export function shouldAnnounce(title: string, labels: string[]): boolean {
  if (labels.some((l) => l.toLowerCase() === "no-announce")) return false;
  const { type, scope } = parsePrTitle(title);
  if (!type || !ANNOUNCE_TYPES.has(type)) return false;
  if (scope && SKIP_SCOPES.has(scope)) return false;
  return true;
}

/**
 * An author-written, public-facing tweet from the PR body — a single line:
 *
 *   Tweet: You can now tag people in the community with @.
 *
 * A PR title is written for a reviewer ("feat(community): @mentions with profile
 * links and notify email"); a tweet is written for a reader. No template pool can
 * bridge that, because the dev subject itself is the problem. So when the author
 * has said what the public should hear, use their words verbatim — the person who
 * wrote the PR has more context than any rewrite of its title could recover.
 *
 * Absent (the common case for quick PRs), the caller falls back to the pools.
 * Returns null for a missing/blank line so the caller's `??` reads naturally.
 */
export function extractTweet(body: string | null | undefined): string | null {
  if (!body) return null;
  const m = body.match(/^[ \t]*Tweet:[ \t]*(\S.*)$/im);
  if (!m) return null;
  // Trailing \r: GitHub bodies are CRLF, and `.` in a non-dotall regex stops at \n
  // but happily eats \r — which would otherwise ride into the post body.
  const line = m[1].trim();
  return line ? line.slice(0, 500) : null;
}

/**
 * `@` is stripped where it would start a word, because {title} is a PR subject
 * echoed into a public post and the feed linkifies @handles. A title like
 * "@mentions with profile links" would otherwise mint a link to a member that
 * doesn't exist — or, worse, a title naming a real handle would email them.
 *
 * Only the word-initial `@` goes (the same rule the tokenizer matches on), so
 * "fix foo@bar.com parsing" survives intact. The Tweet: line is NOT sanitized:
 * a human writing "@sam" there means it.
 */
export function humanizeSubject(subject: string): string {
  const s = subject.trim().replace(/(^|\s)@(?=[a-z0-9])/gi, "$1");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * A PR that will announce but carries no `Tweet:` line — i.e. one that will post
 * to the public feed in words nobody chose.
 *
 * The fallback pool is deliberately kept (a PR really can have nothing to say),
 * but it is ~14 lines, so every missed line is a coin-flip on the feed showing
 * the same sentence twice under the owner's name. That happened on #221/#222.
 * The pool is the safety net; needing it is the bug. CI calls this so the
 * omission fails at review time instead of surfacing as a duplicate post.
 */
export function missingTweet(title: string, labels: string[], body: string | null | undefined): boolean {
  return shouldAnnounce(title, labels) && extractTweet(body) === null;
}
