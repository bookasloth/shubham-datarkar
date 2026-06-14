import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

/**
 * Brand mark. Image-based — currently the Google logo as a PLACEHOLDER until
 * the final mark is ready. Swap `LOGO_SRC` for the real asset (drop it in
 * /public) when available. `showWordmark` is kept for API compatibility.
 */
const LOGO_SRC =
  "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png";

export function Logo({
  className,
  showWordmark = true,
  href = "/",
}: {
  className?: string;
  showWordmark?: boolean;
  href?: string | null;
}) {
  void showWordmark;

  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt={`${site.name} (placeholder logo)`}
      width={272}
      height={92}
      className={cn("h-6 w-auto select-none", className)}
    />
  );

  if (href === null) return mark;
  return (
    <Link
      href={href}
      aria-label={`${site.name} — home`}
      className="inline-flex rounded-btn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {mark}
    </Link>
  );
}
