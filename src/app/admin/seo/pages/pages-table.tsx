"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/admin";
import { DataTable, type Column } from "@/components/admin/data/data-table";
import type { PageAuditEntry } from "@/lib/seo/types";
import { SCORE_TONE, scoreColor } from "@/lib/seo/constants";

type Row = {
  id: string;
  route: string;
  title: string | null;
  reachable: boolean;
  seoScore: number;
  geoScore: number;
  aeoScore: number;
  seoColor: "red" | "orange" | "yellow" | "green";
  geoColor: "red" | "orange" | "yellow" | "green";
  aeoColor: "red" | "orange" | "yellow" | "green";
  schemas: string[];
  inSitemap: boolean;
  issueCount: number;
};

function ScoreBadge({ score, color }: { score: number; color: "red" | "orange" | "yellow" | "green" }) {
  return <StatusBadge tone={SCORE_TONE[color]}>{score}%</StatusBadge>;
}

function toRow(p: PageAuditEntry): Row {
  const { analysis, scores } = p;
  return {
    id: p.entry.route,
    route: p.entry.route,
    title: analysis?.title ?? null,
    reachable: analysis !== null && scores !== null,
    seoScore: scores?.seo.score ?? 0,
    geoScore: scores?.geo.score ?? 0,
    aeoScore: scores?.aeo.score ?? 0,
    seoColor: scoreColor(scores?.seo.score ?? 0),
    geoColor: scoreColor(scores?.geo.score ?? 0),
    aeoColor: scoreColor(scores?.aeo.score ?? 0),
    schemas: analysis?.schemas ?? [],
    inSitemap: p.entry.inSitemap,
    issueCount: scores?.checks.filter((c) => c.applicable && !c.passed).length ?? 0,
  };
}

const columns: Column<Row>[] = [
  {
    key: "route",
    header: "Route",
    sortValue: (r) => r.route,
    cell: (r) => (
      <Link
        href={`/admin/seo/pages/${encodeURIComponent(r.route.slice(1) || "home")}`}
        className="font-medium text-admin-text hover:text-admin-accent"
      >
        {r.route}
      </Link>
    ),
  },
  {
    key: "title",
    header: "Title",
    sortValue: (r) => r.title ?? "",
    cell: (r) => (
      <span className="text-admin-text-muted">{r.title ?? "—"}</span>
    ),
    hideable: true,
  },
  {
    key: "seo",
    header: "SEO",
    sortValue: (r) => (r.reachable ? r.seoScore : -1),
    cell: (r) => (r.reachable ? <ScoreBadge score={r.seoScore} color={r.seoColor} /> : <span className="text-admin-text-muted">—</span>),
  },
  {
    key: "geo",
    header: "GEO",
    sortValue: (r) => (r.reachable ? r.geoScore : -1),
    cell: (r) => (r.reachable ? <ScoreBadge score={r.geoScore} color={r.geoColor} /> : <span className="text-admin-text-muted">—</span>),
  },
  {
    key: "aeo",
    header: "AEO",
    sortValue: (r) => (r.reachable ? r.aeoScore : -1),
    cell: (r) => (r.reachable ? <ScoreBadge score={r.aeoScore} color={r.aeoColor} /> : <span className="text-admin-text-muted">—</span>),
  },
  {
    key: "schema",
    header: "Schema",
    cell: (r) => (
      <span className="text-admin-text-muted">
        {r.schemas.length > 0 ? r.schemas.join(", ") : "None"}
      </span>
    ),
    hideable: true,
  },
  {
    key: "sitemap",
    header: "Sitemap",
    cell: (r) => (
      <StatusBadge tone={r.inSitemap ? "success" : "danger"}>
        {r.inSitemap ? "Yes" : "No"}
      </StatusBadge>
    ),
  },
  {
    key: "issues",
    header: "Issues",
    sortValue: (r) => (r.reachable ? r.issueCount : -1),
    cell: (r) =>
      r.reachable ? (
        <span className={r.issueCount > 0 ? "font-medium text-admin-text" : "text-admin-text-muted"}>
          {r.issueCount}
        </span>
      ) : (
        <StatusBadge tone="warning">Could not fetch</StatusBadge>
      ),
  },
];

export function PagesTable({ pages }: { pages: PageAuditEntry[] }) {
  const rows = pages.map(toRow);
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.route} ${r.title ?? ""}`}
      searchPlaceholder="Search pages..."
      initialSort={{ key: "issues", dir: "desc" }}
      emptyTitle="No pages found"
      emptyDescription="No public pages were discovered."
    />
  );
}
