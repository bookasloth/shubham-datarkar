import { AdminLoadingState } from "@/components/admin/feedback/loading-state";

/**
 * Parent fallback for every /admin route. Approximates PageHeader (title +
 * action) over a table of rows — the shape the list pages that dominate the
 * admin share. Uses the admin-surface pulse token so it reads in the admin
 * theme, not the site palette.
 */
export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="h-8 w-40 animate-pulse rounded-input bg-admin-surface-hover" />
        <div className="h-9 w-28 animate-pulse rounded-input bg-admin-surface-hover" />
      </div>
      <AdminLoadingState rows={8} />
    </div>
  );
}
