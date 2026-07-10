import { buildMetadata } from "@/lib/seo";
import { requireMember } from "@/lib/members/session";
import { getBookmarkedResources } from "@/lib/members/member-queries";
import { ResourceGrid } from "@/components/members/resource-grid";

export const metadata = buildMetadata({ title: "Bookmarks", path: "/members/bookmarks", noIndex: true });

export default async function BookmarksPage() {
  const { capabilities } = await requireMember("/members/bookmarks");
  const resources = await getBookmarkedResources();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Bookmarks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your personal library. {resources.length} saved.
        </p>
      </header>

      <ResourceGrid
        resources={resources}
        capabilities={capabilities}
        emptyTitle="No bookmarks yet"
        emptyDescription="Tap the bookmark button on any resource to save it here."
      />
    </div>
  );
}
