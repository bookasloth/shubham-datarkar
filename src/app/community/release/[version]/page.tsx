import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { listReleaseNotes } from "@/lib/community/spine-queries";
import { SpineStory } from "@/components/community/spine-story";

/** Release notes generated from the feed itself: every note tagged with this
 *  version, newest first. Public read + noIndex, like the rest of /community. */
export async function generateMetadata({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  return buildMetadata({
    title: `Release notes · ${version}`,
    description: `What shipped in ${version}.`,
    path: `/community/release/${version}`,
    noIndex: true,
  });
}

export default async function ReleasePage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const notes = await listReleaseNotes(version);
  if (notes.length === 0) notFound();
  return (
    <SpineStory
      title={`Release notes · ${version}`}
      subtitle={`${notes.length} ${notes.length === 1 ? "note" : "notes"} shipped.`}
      notes={notes}
    />
  );
}
