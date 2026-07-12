/**
 * Conventional-commit parsing + the "is this PR worth announcing" heuristic.
 * Pure — unit-testable directly. Announce feat/fix/perf/chore; skip noise
 * scopes; a `no-announce` label is a hard kill switch.
 */
const ANNOUNCE_TYPES = new Set(["feat", "fix", "perf", "chore"]);
const SKIP_SCOPES = new Set(["deps", "ci", "build", "test", "docs", "refactor", "style"]);

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

export function humanizeSubject(subject: string): string {
  const s = subject.trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
