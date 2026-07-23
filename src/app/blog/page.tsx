import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { blogCategories } from "@/lib/data/posts";
import { getPublishedPosts } from "@/lib/blog/queries";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CategoryNav } from "@/components/content/category-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { PostCard } from "@/components/cards/post-card";
import { BlogHeroArt } from "@/components/blog/hero-art";
import { NewsletterForm } from "@/components/sections/newsletter-form";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDate, readingTime } from "@/lib/utils";

export const metadata = {
  ...buildMetadata({
    title: "Marketing, SEO & AI Essays",
    description:
      "Essays, playbooks, and teardowns on SEO, AI, performance marketing, content, and SaaS. Two a week — one deep dive, one short essay.",
    ogTitle: "Thinking, in public",
    ogDescription:
      "Two a week — one deep dive, one short essay. Systems, receipts, and the occasional contrarian take.",
    path: "/blog",
  }),
  alternates: {
    canonical: `${site.url}/blog`,
    types: { "application/rss+xml": `${site.url}/feed.xml` },
  },
};

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

export default function BlogPage() {
  // Static shell (hero, nav, newsletter) renders instantly; the post feed is
  // isolated in <BlogFeed>, which suspends on its data and streams in behind a
  // skeleton — the page never blocks on the query before painting.
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])} />
      <PageHero
        eyebrow="Blog"
        title="Thinking, in public"
        description="Two a week — one deep dive, one short essay. Systems, receipts, and the occasional contrarian take."
        crumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />

      <Section>
        <Container>
          <CategoryNav active="all" />

          <Suspense fallback={<BlogFeedSkeleton />}>
            <BlogFeed />
          </Suspense>

          <div className="mt-12 rounded-card border border-border bg-card p-8 text-center">
            <h2 className="text-xl font-bold tracking-tight">Never miss the next one</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Get every new piece in your inbox, plus one idea I don’t publish anywhere else.
            </p>
            <NewsletterForm className="mx-auto mt-5 max-w-md" />
          </div>
        </Container>
      </Section>
    </>
  );
}

/** Data-dependent feed. Awaits posts, so it suspends and streams in. */
async function BlogFeed() {
  const posts = await getPublishedPosts();
  const lead = posts.find((p) => p.featured) ?? posts[0];

  if (!lead) {
    return <p className="mt-8 text-muted-foreground">No posts yet.</p>;
  }

  const category = blogCategories.find((c) => c.slug === lead.category);
  const rest = posts.filter((p) => p.slug !== lead.slug);

  return (
    <>
      <Link href={`/blog/${lead.category}/${lead.slug}`} className="group mt-8 block">
        <Card interactive className="overflow-hidden md:grid md:grid-cols-2">
          <BlogHeroArt className="hidden md:block" />
          <div className="flex flex-col p-8">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="muted">{category?.label}</Badge>
              <span aria-hidden>·</span>
              <time dateTime={lead.date}>{formatDate(lead.date)}</time>
              <span aria-hidden>·</span>
              <span>{readingTime(lead.words)} min</span>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">{lead.title}</h2>
            <p className="mt-3 flex-1 text-muted-foreground">{lead.excerpt}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium">
              Read article
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </Card>
      </Link>

      <Stagger className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((p) => (
          <StaggerItem key={p.slug}>
            <PostCard post={p} />
          </StaggerItem>
        ))}
      </Stagger>
    </>
  );
}

/** Feed-shaped skeleton shown while <BlogFeed> streams in. */
function BlogFeedSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mt-8 grid overflow-hidden rounded-card border border-border md:grid-cols-2">
        <Skeleton className="aspect-[16/10] rounded-none" />
        <div className="space-y-3 p-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-card border border-border p-5">
            <Skeleton className="aspect-[16/9] w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
