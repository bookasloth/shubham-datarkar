import { buildMetadata } from "@/lib/seo";
import { getMemberContext } from "@/lib/members/session";
import { listResources } from "@/lib/resources/queries";
import { ResourceGrid } from "@/components/members/resource-grid";

export const metadata = buildMetadata({ title: "Latest", path: "/members/latest", noIndex: true });

export default async function LatestPage() {
  const [{ capabilities }, resources] = await Promise.all([
    getMemberContext(),
    listResources({ sort: "newest", limit: 30 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Latest</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The newest resources, most recent first.
        </p>
      </header>

      <ResourceGrid
        resources={resources}
        capabilities={capabilities}
        emptyTitle="Nothing here yet"
        emptyDescription="New resources land every week. Check back soon."
      />
    </div>
  );
}
