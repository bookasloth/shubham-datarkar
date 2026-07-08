import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  page?: string;
};

const PAGE_SIZE = 24;

function pageHref(sp: Params, page: number): string {
  const params = new URLSearchParams();
  for (const key of ["q", "type", "category", "difficulty", "sort"] as const) {
    if (sp[key]) params.set(key, sp[key]!);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/members/explore${qs ? `?${qs}` : ""}`;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const [{ capabilities, user }, types, categories] = await Promise.all([
    getMemberContext(),
    listTypes(),
    listCategories(),
  ]);

  const q = sp.q?.trim();
  const page = Math.max(1, Number(sp.page) || 1);
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
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
  }
  const hasNext = !q && resources.length === PAGE_SIZE;

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

      <ResourceGrid resources={resources} capabilities={capabilities} />

      {(page > 1 || hasNext) && (
        <nav className="flex items-center justify-between pt-2">
          {page > 1 ? (
            <Link
              href={pageHref(sp, page - 1)}
              className="inline-flex items-center gap-1.5 rounded-btn border border-border px-3 py-1.5 text-xs transition-ui hover:bg-accent"
            >
              <ArrowLeft className="size-3.5" /> Newer
            </Link>
          ) : (
            <span />
          )}
          {hasNext && (
            <Link
              href={pageHref(sp, page + 1)}
              className="inline-flex items-center gap-1.5 rounded-btn border border-border px-3 py-1.5 text-xs transition-ui hover:bg-accent"
            >
              Older <ArrowRight className="size-3.5" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
