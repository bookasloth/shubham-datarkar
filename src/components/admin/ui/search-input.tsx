import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/** Bordered search field; icon leading; border → accent on focus-within.
 *  Uses rounded-input (8px) per the shared radius scale. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-input border border-admin-border bg-admin-surface px-3 " +
          "transition-[border-color] duration-150 focus-within:border-admin-border-active",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-admin-text-muted" aria-hidden />
      <input
        ref={ref}
        type="search"
        className="min-w-0 flex-1 bg-transparent text-sm text-admin-text outline-none placeholder:text-admin-text-muted"
        {...props}
      />
    </div>
  ),
);
SearchInput.displayName = "SearchInput";
