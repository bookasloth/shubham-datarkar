import { Library } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { getPublishedCollections } from "@/lib/movies/queries";
import { CollectionCard } from "@/components/movies/collection-card";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Movie Collections",
  description:
    "Curated movie collections — thrillers, hidden gems, weekend watches, and more, each hand-picked and reviewed.",
  path: "/collections",
});

export default async function CollectionsPage() {
  const collections = await getPublishedCollections();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Themed sets of films I keep coming back to.
        </p>
      </header>

      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-16 text-center">
          <Library className="mb-3 size-7 text-muted-foreground" aria-hidden />
          <p className="font-display text-lg font-semibold">No collections yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Curated lists are on the way.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      )}
    </div>
  );
}
