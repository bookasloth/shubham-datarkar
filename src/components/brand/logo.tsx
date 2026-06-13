import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

/**
 * The recognizable mark used on every page: a monogram tile + wordmark.
 * Pure monochrome so it reads on light or dark surfaces.
 */
export function Logo({
  className,
  showWordmark = true,
  href = "/",
}: {
  className?: string;
  showWordmark?: boolean;
  href?: string | null;
}) {
  const mark = (
    <span className={cn("group inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-btn bg-foreground font-display text-sm font-extrabold leading-none text-background transition-ui group-hover:-translate-y-px"
      >
        SD
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-sm font-bold tracking-tight">{site.name}</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {site.alias}
          </span>
        </span>
      )}
    </span>
  );

  if (href === null) return mark;
  return (
    <Link
      href={href}
      aria-label={`${site.name} — home`}
      className="rounded-btn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {mark}
    </Link>
  );
}
