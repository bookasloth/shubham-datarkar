import * as React from "react";
import { cn } from "@/lib/utils";

export function AdminEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-admin-border " +
          "bg-admin-surface px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-card bg-admin-surface-hover text-admin-text-muted [&_svg]:size-6">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-admin-text">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-admin-text-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
