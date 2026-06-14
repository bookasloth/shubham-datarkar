import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/** Build a page list with ellipses, e.g. [1, "…", 4, 5, 6, "…", 12]. */
function pageRange(current: number, total: number): (number | "ellipsis")[] {
  const delta = 1;
  const range: (number | "ellipsis")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("ellipsis");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("ellipsis");
  if (total > 1) range.push(total);
  return range;
}

export function Pagination({
  current,
  total,
  hrefFor,
  className,
}: {
  current: number;
  total: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (total <= 1) return null;
  const pages = pageRange(current, total);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      <Link
        href={hrefFor(Math.max(1, current - 1))}
        aria-label="Previous page"
        aria-disabled={current === 1}
        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), current === 1 && "pointer-events-none opacity-50")}
      >
        <ChevronLeft />
      </Link>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-2 text-sm text-muted-foreground" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === current ? "page" : undefined}
            className={cn(buttonVariants({ variant: p === current ? "default" : "ghost", size: "icon-sm" }))}
          >
            {p}
          </Link>
        ),
      )}
      <Link
        href={hrefFor(Math.min(total, current + 1))}
        aria-label="Next page"
        aria-disabled={current === total}
        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), current === total && "pointer-events-none opacity-50")}
      >
        <ChevronRight />
      </Link>
    </nav>
  );
}
