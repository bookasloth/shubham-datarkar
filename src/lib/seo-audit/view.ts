// Pure projection of a stored audit row into the gated public view. The free
// tier gets both scores and the top few findings (enough to prove there's a
// real opportunity, spec §18); the full findings list + LLM report unlock only
// after the email. Scores are identical in both tiers — no bait-and-switch.
import type { AuditReport, AuditScores, AuditView, Finding } from "./types";

const FREE_FINDINGS = 3;

export type AuditRowView = {
  id: string;
  url: string;
  domain: string;
  status: string;
  progress: number;
  report_status: string;
  page_count: number | null;
  scores: AuditScores | null;
  findings: Finding[] | null;
  report: AuditReport | null;
};

export function projectAudit(row: AuditRowView): AuditView {
  const unlocked = row.report_status === "unlocked";
  const all = row.findings ?? [];
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    status: row.status,
    progress: row.progress,
    reportStatus: unlocked ? "unlocked" : "free",
    pageCount: row.page_count,
    scores: row.scores,
    findings: unlocked ? all : all.slice(0, FREE_FINDINGS),
    findingsTotal: all.length,
    report: unlocked ? row.report : null,
  };
}
