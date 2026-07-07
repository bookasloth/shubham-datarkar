import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { getMemberContext } from "@/lib/members/session";
import { canAccess } from "@/lib/members/access";
import { trackView } from "@/lib/members/tracking";
import {
  getNextResource,
  getRelatedResources,
  getResourceBySlug,
  getTagsForResource,
} from "@/lib/resources/queries";
import { ResourceGrid } from "@/components/members/resource-grid";
import { ResourceContent } from "@/components/members/resource-content";
import { Paywall } from "@/components/members/paywall";
import { ShareButton } from "@/components/members/share-button";
import { TypeIcon } from "@/components/members/type-icons";
import Link from "next/link";

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ role, user }, resource] = await Promise.all([
    getMemberContext(),
    getResourceBySlug(slug),
  ]);

  if (!resource) notFound();
  if (resource.status !== "published" && role !== "admin") notFound();
  if (resource.visibility === "hidden" && role !== "admin") notFound();

  const allowed = canAccess(resource.visibility, role);
  const [tags, related, next] = await Promise.all([
    getTagsForResource(resource.id),
    getRelatedResources(resource, 3),
    getNextResource(resource),
  ]);
  await trackView(resource.id, user?.id);

  const updated = new Date(resource.updated_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero */}
      <header className="border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-btn bg-accent px-2 py-1 font-medium">
            <TypeIcon type={resource.type} className="size-3.5" />
            <span className="capitalize">{resource.type.replace("-", " ")}</span>
          </span>
          {resource.category && (
            <Link
              href={`/members/explore?category=${resource.category.slug}`}
              className="rounded-btn px-2 py-1 transition-ui hover:bg-accent hover:text-foreground"
            >
              {resource.category.name}
            </Link>
          )}
          {resource.difficulty && <span className="capitalize">{resource.difficulty}</span>}
        </div>

        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
          {resource.title}
        </h1>
        {resource.description && (
          <p className="mt-2 text-base text-muted-foreground">{resource.description}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span>{resource.author}</span>
          <span>Updated {updated}</span>
          {resource.reading_time ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {resource.reading_time} min
            </span>
          ) : null}
          <span className="ml-auto flex items-center gap-2">
            {/* Bookmark button mounts here in the member-features phase. */}
            <ShareButton title={resource.title} />
          </span>
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link
                key={t.id}
                href={`/members/explore?q=${encodeURIComponent(t.name)}`}
                className="rounded-btn border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Content or paywall */}
      <div className="py-8">
        {allowed ? (
          <ResourceContent resource={resource} />
        ) : (
          <Paywall
            visibility={resource.visibility}
            excerpt={resource.excerpt ?? resource.description}
            returnPath={`/members/resources/${resource.slug}`}
          />
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border pt-8">
          <h2 className="font-display text-lg font-semibold">Related resources</h2>
          <div className="mt-4">
            <ResourceGrid resources={related} role={role} />
          </div>
        </section>
      )}

      {/* Next */}
      {next && (
        <Link
          href={`/members/resources/${next.slug}`}
          className="group mt-8 flex items-center justify-between rounded-card border border-border bg-card p-5 transition-ui hover:border-foreground/30"
        >
          <div>
            <div className="text-xs text-muted-foreground">Next resource</div>
            <div className="mt-0.5 font-display text-sm font-semibold group-hover:underline group-hover:underline-offset-4">
              {next.title}
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
