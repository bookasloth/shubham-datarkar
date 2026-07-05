"use client";

import Link from "next/link";
import { AdminCard, StatusBadge, AdminButton } from "@/components/admin";
import { KPIWidget } from "@/components/admin/widgets";
import type { AuditSummary, ScoreColor } from "@/lib/seo/types";
import { SCORE_TONE } from "@/lib/seo/constants";

const COLOR_LABELS: Record<ScoreColor, string> = {
  green: "Good (85-100)",
  yellow: "OK (70-84)",
  orange: "Needs work (50-69)",
  red: "Critical (0-49)",
};

export function SeoDashboard({ summary }: { summary: AuditSummary }) {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        <KPIWidget label="Total Pages" value={summary.totalPages} href="/admin/seo/pages" />
        <KPIWidget label="Indexed" value={summary.indexedPages} />
        <KPIWidget label="Not Indexed" value={summary.notIndexedPages} />
        <KPIWidget label="Missing Metadata" value={summary.missingMetadata} />
        <KPIWidget label="Missing Schema" value={summary.missingSchema} />
        <KPIWidget label="Missing OG Image" value={summary.missingOgImage} />
        <KPIWidget label="Avg SEO" value={`${summary.avgSeoScore}%`} />
        <KPIWidget label="Avg GEO" value={`${summary.avgGeoScore}%`} />
      </div>

      {/* Score distribution */}
      <AdminCard>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
          Score Distribution
        </h2>
        <div className="flex flex-wrap gap-3">
          {(["green", "yellow", "orange", "red"] as const).map((color) => (
            <div key={color} className="flex items-center gap-2">
              <StatusBadge tone={SCORE_TONE[color]}>
                {summary.colorDistribution[color]}
              </StatusBadge>
              <span className="text-sm text-admin-text-muted">{COLOR_LABELS[color]}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Top issues */}
      {summary.issuesByType.length > 0 && (
        <AdminCard>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-admin-text-muted">
            Top Issues
          </h2>
          <div className="flex flex-col gap-2">
            {summary.issuesByType.slice(0, 10).map((issue) => (
              <div key={issue.label} className="flex items-center justify-between text-sm">
                <span className="text-admin-text">{issue.label}</span>
                <StatusBadge tone="danger">{issue.count} pages</StatusBadge>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      {/* Quick link */}
      <div>
        <AdminButton asChild>
          <Link href="/admin/seo/pages">View All Pages</Link>
        </AdminButton>
      </div>
    </div>
  );
}
