"use client";

import { AdminCard, StatusBadge } from "@/components/admin";
import type { PageAuditEntry, CheckResult, ScoreBreakdown } from "@/lib/seo/types";
import { SCORE_TONE, scoreColor } from "@/lib/seo/constants";

function ScoreCard({ label, breakdown }: { label: string; breakdown: ScoreBreakdown }) {
  const color = scoreColor(breakdown.score);
  return (
    <AdminCard>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-admin-text-muted">{label}</h3>
        <StatusBadge tone={SCORE_TONE[color]}>{breakdown.score}%</StatusBadge>
      </div>
      <p className="mt-2 text-2xl font-bold text-admin-text">{breakdown.passed.length}/{breakdown.passed.length + breakdown.failed.length}</p>
      <p className="text-xs text-admin-text-muted">checks passed</p>
    </AdminCard>
  );
}

function CharCount({ value, min, max }: { value: number; min: number; max: number }) {
  const inRange = value >= min && value <= max;
  return (
    <span className={inRange ? "text-admin-success" : "text-admin-danger"}>
      {value} chars {inRange ? `(good: ${min}-${max})` : `(target: ${min}-${max})`}
    </span>
  );
}

function MetadataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-admin-border py-3 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-admin-text-muted">{label}</span>
      <div className="text-sm text-admin-text">{children}</div>
    </div>
  );
}

function RecommendationCard({ check }: { check: CheckResult }) {
  const priorityTone = check.priority === "high" ? "danger" : check.priority === "medium" ? "warning" : "neutral";
  return (
    <div className="flex items-center justify-between border-b border-admin-border py-3 last:border-0">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-admin-text">{check.label}</span>
        <div className="flex gap-1.5">
          <StatusBadge tone="neutral">{check.category.toUpperCase()}</StatusBadge>
          <StatusBadge tone={priorityTone}>{check.priority}</StatusBadge>
        </div>
      </div>
    </div>
  );
}

export function PageDetail({ data }: { data: PageAuditEntry }) {
  const { entry, analysis, scores } = data;

  if (!analysis || !scores) {
    return (
      <AdminCard>
        <h2 className="text-sm font-medium text-admin-text">Could not fetch {entry.route}</h2>
        <p className="mt-2 text-sm text-admin-text-muted">
          The audit fetches each route&apos;s rendered HTML. This one did not respond — it may be an
          unexpanded dynamic template, or the server may have been unreachable. Try Re-run audit.
        </p>
      </AdminCard>
    );
  }

  const failedChecks = scores.checks
    .filter((c) => !c.passed)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Score cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ScoreCard label="SEO Score" breakdown={scores.seo} />
        <ScoreCard label="GEO Score" breakdown={scores.geo} />
        <ScoreCard label="AEO Score" breakdown={scores.aeo} />
      </div>

      {/* Metadata */}
      <AdminCard>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
          Metadata
        </h2>
        <MetadataRow label="Title">
          {analysis.title ?? <span className="italic text-admin-text-muted">Not set</span>}
          {analysis.title && (
            <span className="ml-2 text-xs">
              <CharCount value={analysis.titleLength} min={30} max={60} />
            </span>
          )}
        </MetadataRow>
        <MetadataRow label="Description">
          {analysis.description ?? <span className="italic text-admin-text-muted">Not set</span>}
          {analysis.description && (
            <span className="ml-2 text-xs">
              <CharCount value={analysis.descriptionLength} min={120} max={160} />
            </span>
          )}
        </MetadataRow>
        <MetadataRow label="Structured Data Health">
          <span className="flex gap-2">
            <StatusBadge tone={analysis.schemaParseErrors === 0 ? "success" : "danger"}>
              {analysis.schemaParseErrors === 0
                ? "All JSON-LD parsed"
                : `${analysis.schemaParseErrors} malformed block(s)`}
            </StatusBadge>
            {!analysis.mainRegionFound && (
              <StatusBadge tone="warning">No &lt;main&gt; — counts include chrome</StatusBadge>
            )}
          </span>
        </MetadataRow>
        <MetadataRow label="Canonical">
          <StatusBadge tone={analysis.hasCanonical ? "success" : "danger"}>
            {analysis.hasCanonical ? "Yes" : "No"}
          </StatusBadge>
        </MetadataRow>
        <MetadataRow label="Robots">
          <span className="flex gap-2">
            <StatusBadge tone={analysis.robotsIndex ? "success" : "danger"}>
              {analysis.robotsIndex ? "Index" : "NoIndex"}
            </StatusBadge>
            <StatusBadge tone={analysis.robotsFollow ? "success" : "danger"}>
              {analysis.robotsFollow ? "Follow" : "NoFollow"}
            </StatusBadge>
          </span>
        </MetadataRow>
        <MetadataRow label="Open Graph">
          <StatusBadge tone={analysis.hasOgTags ? "success" : "danger"}>
            {analysis.hasOgTags ? "Yes" : "No"}
          </StatusBadge>
        </MetadataRow>
        <MetadataRow label="Twitter Card">
          <StatusBadge tone={analysis.hasTwitterCard ? "success" : "danger"}>
            {analysis.hasTwitterCard ? "Yes" : "No"}
          </StatusBadge>
        </MetadataRow>
        <MetadataRow label="OG Image">
          <StatusBadge
            tone={analysis.ogImageSource === "dedicated" ? "success" : analysis.ogImageSource === "root-fallback" ? "warning" : "danger"}
          >
            {analysis.ogImageSource}
          </StatusBadge>
        </MetadataRow>
        <MetadataRow label="Schemas">
          {analysis.schemas.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {analysis.schemas.map((s) => (
                <StatusBadge key={s} tone="info">{s}</StatusBadge>
              ))}
            </span>
          ) : (
            <StatusBadge tone="danger">None</StatusBadge>
          )}
        </MetadataRow>
        <MetadataRow label="In Sitemap">
          <StatusBadge tone={entry.inSitemap ? "success" : "danger"}>
            {entry.inSitemap ? "Yes" : "No"}
          </StatusBadge>
        </MetadataRow>
      </AdminCard>

      {/* Content Analysis */}
      <AdminCard>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
          Content Analysis
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-admin-text-muted">H1</p>
            <p className="text-lg font-bold text-admin-text">{analysis.h1Count}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">H2</p>
            <p className="text-lg font-bold text-admin-text">{analysis.h2Count}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">H3</p>
            <p className="text-lg font-bold text-admin-text">{analysis.h3Count}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">Word Count</p>
            <p className="text-lg font-bold text-admin-text">{analysis.wordCount}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">Reading Time</p>
            <p className="text-lg font-bold text-admin-text">{analysis.readingTime} min</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">Internal Links</p>
            <p className="text-lg font-bold text-admin-text">{analysis.internalLinks}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">External Links</p>
            <p className="text-lg font-bold text-admin-text">{analysis.externalLinks}</p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">Images</p>
            <p className="text-lg font-bold text-admin-text">
              {analysis.imageCount}
              {analysis.missingAltCount > 0 && (
                <span className="ml-1 text-sm text-admin-danger">({analysis.missingAltCount} missing alt)</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-admin-text-muted">Lists & Tables</p>
            <p className="text-lg font-bold text-admin-text">{analysis.listCount}</p>
          </div>
        </div>
      </AdminCard>

      {/* Recommendations */}
      {failedChecks.length > 0 && (
        <AdminCard>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
            Recommendations ({failedChecks.length})
          </h2>
          {failedChecks.map((check) => (
            <RecommendationCard key={check.id} check={check} />
          ))}
        </AdminCard>
      )}
    </div>
  );
}
