import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

/**
 * Brand mark. `showWordmark` (default true) renders the full wordmark, which has
 * two hosted variants swapped by theme via the `dark:` class variant
 * (next-themes uses the `.dark` class), so it's SSR-safe with no flash and needs
 * no client JS:
 *  - light theme → black wordmark
 *  - dark theme  → white wordmark
 * `showWordmark={false}` renders the standalone square app mark instead — used on
 * the bare auth pages, which have no navbar to carry the brand. The mark is a
 * self-contained (maskable) PWA icon, so it reads correctly in both themes.
 * Intrinsic width/height are set on every <img> to reserve space and avoid CLS.
 */
const LOGO_LIGHT = "https://company-assets.bookasloth.in/images/sd/website/logo-black.webp";
const LOGO_DARK = "https://company-assets.bookasloth.in/images/sd/website/logo-white.webp";
const MARK = "/web-app-manifest-192x192.png";

export function Logo({
  className,
  showWordmark = true,
  href = "/",
}: {
  className?: string;
  showWordmark?: boolean;
  href?: string | null;
}) {
  const mark = showWordmark ? (
    <span className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_LIGHT}
        alt={site.name}
        width={512}
        height={128}
        className={cn("block h-9 w-auto select-none dark:hidden", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_DARK}
        alt=""
        aria-hidden
        width={512}
        height={128}
        className={cn("hidden h-9 w-auto select-none dark:block", className)}
      />
    </span>
  ) : (
    <span className="inline-flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MARK}
        alt={site.name}
        width={192}
        height={192}
        className={cn("block size-12 select-none rounded-card", className)}
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
