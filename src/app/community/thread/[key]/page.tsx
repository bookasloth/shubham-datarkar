import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { listThreadNotes } from "@/lib/community/spine-queries";
import { SpineStory } from "@/components/community/spine-story";
import { humanizeThread } from "@/components/community/note-badges";

/** A build-in-public arc: every note tagged with this thread, oldest → newest.
 *  Public read — these are the owner's own build-log notes, and public
 *  visibility is the whole point. noIndex, like the rest of /community. */
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
  const notes = await listThreadNotes(key);
  if (notes.length === 0) notFound();
  const name = humanizeThread(key);
  return (
    <SpineStory
      title={`The ${name} story`}
      subtitle={`${notes.length} ${notes.length === 1 ? "note" : "notes"}, oldest first.`}
      notes={notes}
    />
  );
}
