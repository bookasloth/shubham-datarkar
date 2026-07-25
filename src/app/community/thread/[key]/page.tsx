import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getMemberContext } from "@/lib/members/session";
import { listThreadFeed, listPollResults, viewerCanPost } from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";
import { humanizeThread } from "@/components/community/note-badges";

/** A build-in-public arc: every note tagged with this thread, oldest → newest,
 *  as full note cards joined by a thread line. Public read — these are the
 *  owner's own build-log notes; public visibility is the point. noIndex. */
export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const name = humanizeThread(key);
  return buildMetadata({
    title: `The ${name} story`,
    description: `How ${name} came together, note by note.`,
    path: `/community/thread/${key}`,
    noIndex: true,
  });
}

export default async function ThreadPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const notes = await listThreadFeed(key);
  if (notes.length === 0) notFound();

  const { user } = await getMemberContext();
  const [canPost, pollResults] = await Promise.all([
    user ? viewerCanPost() : Promise.resolve(false),
    listPollResults(notes.filter((p) => p.type === "poll").map((p) => p.id)),
  ]);
  const name = humanizeThread(key);

  return (
    <div>
      <header className="border-b border-border px-4 py-4">
        <h1 className="font-display text-xl font-bold">The {name} story</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {notes.length} {notes.length === 1 ? "note" : "notes"}, oldest first.
        </p>
      </header>

      {/* The thread line: a vertical rail on the left that the note cards hang
          off of, so the arc reads as one connected story, not a plain list. */}
      <div className="relative py-4 pl-4">
        <div aria-hidden className="absolute bottom-8 left-6 top-8 w-px bg-border" />
        <ol className="space-y-0">
          {notes.map((post) => (
            <li key={post.rowId} className="relative pl-6">
              <span
                aria-hidden
                className="absolute left-6 top-6 size-2 -translate-x-1/2 rounded-full bg-border ring-4 ring-background"
              />
              <PostCard
                post={post}
                pollResult={pollResults[post.id]}
                canVote={canPost}
                viewerId={user?.id ?? null}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
