import Link from "next/link";
import { AdminCard } from "@/components/admin";

export function RecentCard({
  title,
  viewAllHref,
  isEmpty,
  emptyLabel = "Nothing yet.",
  children,
}: {
  title: string;
  viewAllHref?: string;
  isEmpty?: boolean;
  emptyLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <AdminCard className="flex flex-col p-0">
      <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
        <h2 className="text-sm font-semibold text-admin-text">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs text-admin-text-muted transition-[color] duration-150 hover:text-admin-accent"
          >
            View all
          </Link>
        )}
      </div>
      {isEmpty ? (
        <p className="px-4 py-8 text-center text-sm text-admin-text-muted">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-admin-border">{children}</ul>
      )}
    </AdminCard>
  );
}
