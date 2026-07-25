import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import type { SpineNote } from "@/lib/community/spine-queries";

/** Read-only timeline for a thread arc or a release. Each row is the note's body
 *  + when it landed, linking to the note's permalink for the full thing. */
export function SpineStory({
  title,
  subtitle,
  notes,
}: {
  title: string;
  subtitle: string;
  notes: SpineNote[];
}) {
  return (
    <div>
      <header className="border-b border-border px-4 py-4">
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </header>
      <ol className="divide-y divide-border">
        {notes.map((n, i) => (
          <li key={n.publicId}>
            <Link
              href={`/community/p/${n.publicId}`}
              className="block px-4 py-4 transition-ui hover:bg-muted/30"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{n.body}</p>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
