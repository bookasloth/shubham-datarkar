import Link from "next/link";
import { GitBranch, Tag } from "lucide-react";

/** Humanize a thread slug for display: "sign-in-wall" → "Sign-in wall". */
export function humanizeThread(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CHIP =
  "relative z-10 inline-flex items-center gap-1 rounded-btn bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-ui hover:text-foreground";

/** The spine chips under a note: which feature arc it belongs to, and which
 *  release it shipped in. Renders nothing when the note carries neither tag. */
export function NoteBadges({ thread, version }: { thread: string | null; version: string | null }) {
  if (!thread && !version) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {thread && (
        <Link href={`/community/thread/${thread}`} className={CHIP}>
          <GitBranch className="size-3" /> Part of: {humanizeThread(thread)}
        </Link>
      )}
      {version && (
        <Link href={`/community/release/${encodeURIComponent(version)}`} className={CHIP}>
          <Tag className="size-3" /> shipped in {version}
        </Link>
      )}
    </div>
  );
}
