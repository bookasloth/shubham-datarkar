import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

/**
 * Brand mark. Two hosted variants swapped by theme via the `dark:` class
 * variant (next-themes uses the `.dark` class), so it's SSR-safe with no
 * flash and needs no client JS.
 *  - light theme → black wordmark
 *  - dark theme  → white wordmark
 * `showWordmark` is kept for API compatibility.
 */
const LOGO_LIGHT = "https://company-assets.bookasloth.in/images/sd/website/logo-black.webp";
const LOGO_DARK = "https://company-assets.bookasloth.in/images/sd/website/logo-white.webp";

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
    <span className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_LIGHT}
        alt={site.name}
        className={cn("block h-9 w-auto select-none dark:hidden", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_DARK}
        alt=""
        aria-hidden
        className={cn("hidden h-9 w-auto select-none dark:block", className)}
      />
    </span>
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
