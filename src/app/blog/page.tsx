import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { posts, featuredPosts, blogCategories } from "@/lib/data/posts";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CategoryNav } from "@/components/content/category-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { PostCard } from "@/components/cards/post-card";
import { NewsletterForm } from "@/components/sections/newsletter-form";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDate, readingTime } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Blog",
  description: "Essays, playbooks, and teardowns on SEO, AI, performance marketing, content, SaaS, and founder life.",
  path: "/blog",
});

export default function BlogPage() {
  const lead = featuredPosts[0];
  const category = blogCategories.find((c) => c.slug === lead.category);
  const rest = posts.filter((p) => p.slug !== lead.slug);

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

          {/* Featured lead */}
          <Link href={`/blog/${lead.category}/${lead.slug}`} className="group mt-8 block">
            <Card interactive className="overflow-hidden md:grid md:grid-cols-2">
              <div className="bg-grid hidden bg-muted/40 md:block" aria-hidden />
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
