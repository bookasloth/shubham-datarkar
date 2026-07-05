import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-admin-border " +
          "bg-admin-surface px-6 py-16 text-center",
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-card bg-admin-danger/12 text-admin-danger [&_svg]:size-6">
        <AlertTriangle aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-admin-text">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-admin-text-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
