import { Suspense } from "react";
import { getMemberContext } from "@/lib/members/session";
import { trackSearch } from "@/lib/members/tracking";
import {
  listCategories,
  listResources,
  listTypes,
  searchResources,
} from "@/lib/resources/queries";
import { FilterBar } from "@/components/members/filter-bar";
import { ResourceGrid } from "@/components/members/resource-grid";

export const metadata = { title: "Explore" };

type Params = {
  q?: string;
  type?: string;
  category?: string;
  difficulty?: string;
  sort?: string;
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const [{ role, user }, types, categories] = await Promise.all([
    getMemberContext(),
    listTypes(),
    listCategories(),
  ]);

  const q = sp.q?.trim();
  let resources;
  if (q) {
    resources = await searchResources(q);
    await trackSearch(q, user?.id);
  } else {
    const categoryId = sp.category
      ? categories.find((c) => c.slug === sp.category)?.id
      : undefined;
    resources = await listResources({
      type: sp.type,
      categoryId,
      difficulty: sp.difficulty,
      sort: sp.sort === "popular" ? "popular" : "newest",
      limit: 48,
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {q ? `Results for "${q}"` : "Explore"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {q
            ? `${resources.length} resource${resources.length === 1 ? "" : "s"} found`
            : "Prompts, templates, workflows, tools, and playbooks."}
        </p>
      </header>

      <Suspense>
        <FilterBar types={types} categories={categories} />
      </Suspense>

      <ResourceGrid resources={resources} role={role} />
    </div>
  );
}
