import { notFound } from "next/navigation";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { blogCategories } from "@/lib/data/posts";
import { getPublishedPostsByCategory } from "@/lib/blog/queries";
import type { BlogCategory } from "@/lib/data/types";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CategoryNav } from "@/components/content/category-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { PostCard } from "@/components/cards/post-card";
import { JsonLd } from "@/components/seo/json-ld";
import { FileText } from "lucide-react";

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

// Category set is a fixed list — prerender all of them at build.
export function generateStaticParams() {
  return blogCategories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = blogCategories.find((c) => c.slug === category);
  if (!cat) return buildMetadata({ title: "Blog", path: `/blog/${category}` });
  return buildMetadata({ title: `${cat.label} Articles`, description: cat.description, path: `/blog/${cat.slug}` });
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = blogCategories.find((c) => c.slug === category);
  if (!cat) notFound();

  const categoryPosts = await getPublishedPostsByCategory(cat.slug as BlogCategory);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: cat.label, path: `/blog/${cat.slug}` },
        ])}
      />
      <PageHero
        eyebrow="Blog"
        title={`${cat.label} articles`}
        description={cat.description}
        crumbs={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: cat.label }]}
      />
      <Section>
        <Container>
          <CategoryNav active={cat.slug} />
          {categoryPosts.length ? (
            <Stagger className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryPosts.map((p) => (
                <StaggerItem key={p.slug}>
                  <PostCard post={p} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <div className="mt-8">
              <EmptyState
                icon={<FileText />}
                title="Nothing here yet"
                description="No articles in this category right now. Check back soon — two ship every week."
              />
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
