import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { requireMember } from "@/lib/members/session";
import {
  getContinueReading,
  getRecentlyViewed,
} from "@/lib/members/member-queries";
import { listCategories, listResources } from "@/lib/resources/queries";
import { canAccess } from "@/lib/members/access";
import { ResourceCard } from "@/components/members/resource-card";
import { ResourceGrid } from "@/components/members/resource-grid";

export const metadata = { title: "Dashboard" };

function SectionHeading({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-ui hover:text-foreground"
        >
          View all <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

export default async function MembersDashboard() {
  const { user, role } = await requireMember("/members");
  const name = user!.email?.split("@")[0] ?? "there";

  const [featured, continueReading, recent, latest, trending, categories] = await Promise.all([
    listResources({ featured: true, limit: 3 }),
    getContinueReading(3),
    getRecentlyViewed(3),
    listResources({ sort: "newest", limit: 6 }),
    listResources({ sort: "popular", limit: 3 }),
    listCategories(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Welcome back, {name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your marketing workspace. Something new every week.
        </p>
        <form action="/members/explore" method="get" className="mt-4 max-w-md sm:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              placeholder="Search resources"
              className="w-full rounded-input border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none transition-ui focus:border-brand"
            />
          </div>
        </form>
      </header>

      {featured.length > 0 && (
        <section className="space-y-3">
          <SectionHeading title="Featured" href="/members/explore" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((r) => (
              <ResourceCard key={r.id} resource={r} locked={!canAccess(r.visibility, role)} />
            ))}
          </div>
        </section>
      )}

      {continueReading.length > 0 && (
        <section className="space-y-3">
          <SectionHeading title="Continue reading" />
          <div className="space-y-2">
            {continueReading.map((r) => (
              <Link
                key={r.id}
                href={`/members/resources/${r.slug}`}
                className="group flex items-center gap-4 rounded-card border border-border bg-card px-4 py-3 transition-ui hover:border-foreground/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium group-hover:underline group-hover:underline-offset-4">
                    {r.title}
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${Math.round(r.progress * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(r.progress * 100)}%
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && continueReading.length === 0 && (
        <section className="space-y-3">
          <SectionHeading title="Recently viewed" />
          <ResourceGrid resources={recent} role={role} />
        </section>
      )}

      <section className="space-y-3">
        <SectionHeading title="Recently added" href="/members/latest" />
        <ResourceGrid
          resources={latest}
          role={role}
          emptyTitle="Nothing here yet"
          emptyDescription="New resources land every week."
        />
      </section>

      {categories.length > 0 && (
        <section className="space-y-3">
          <SectionHeading title="Categories" />
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/members/explore?category=${c.slug}`}
                className="rounded-btn border border-border px-3 py-1.5 text-xs transition-ui hover:bg-accent"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section className="space-y-3">
          <SectionHeading title="Trending" href="/members/explore?sort=popular" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {trending.map((r) => (
              <ResourceCard key={r.id} resource={r} locked={!canAccess(r.visibility, role)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
