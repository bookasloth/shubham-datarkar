import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import { buildMetadata, articleSchema, breadcrumbSchema } from "@/lib/seo";
import { blogCategories, author } from "@/lib/data/posts";
import { getPublishedPost, getPublishedPostsByCategory, getPublishedPosts } from "@/lib/blog/queries";
import { Container, Section } from "@/components/layout/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArticleBody } from "@/components/content/article-body";
import { getAffiliateDomains } from "@/lib/content/affiliate-queries";
import { ReadingProgress } from "@/components/content/reading-progress";
import { PostFooter } from "@/components/blog/post-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDate, readingTime } from "@/lib/utils";

export const revalidate = 300; // ISR: static HTML from CDN, refresh every 5 min

// Prerender every published article at build so first visit is CDN-instant.
export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ category: p.category, slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return buildMetadata({ title: "Article", path: `/blog/${category}/${slug}` });
  // queries.ts now selects seo_title/og_title/og_description (migration
  // 20260711000002 is applied), so these are populated per-post when an author
  // fills them in the editor; the `?? post.title` fallback covers empty ones.
  return buildMetadata({
    title: post.seoTitle ?? post.title,
    description: post.excerpt,
    ogTitle: post.ogTitle,
    ogDescription: post.ogDescription,
    path: `/blog/${post.category}/${post.slug}`,
    type: "article",
    publishedTime: post.date,
    modifiedTime: post.dateModified,
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post || post.category !== category) notFound();

  const cat = blogCategories.find((c) => c.slug === post.category);
  const sameCat = await getPublishedPostsByCategory(post.category);
  // Read Next: same-category posts first, then top up from the rest, up to 4.
  const sameCatRelated = sameCat.filter((p) => p.slug !== post.slug);
  const allPublished = await getPublishedPosts();
  const others = allPublished.filter(
    (p) => p.slug !== post.slug && !sameCatRelated.some((s) => s.slug === p.slug),
  );
  const relatedPosts = [...sameCatRelated, ...others].slice(0, 4);
  const affiliateDomains = await getAffiliateDomains();

  return (
    <>
      <ReadingProgress />
      <JsonLd
        data={[
          articleSchema({
            title: post.title,
            description: post.excerpt,
            path: `/blog/${post.category}/${post.slug}`,
            datePublished: post.date,
            dateModified: post.dateModified,
            image: `${site.url}/blog/${post.category}/${post.slug}/opengraph-image`,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: cat?.label ?? post.category, path: `/blog/${post.category}` },
            { name: post.title, path: `/blog/${post.category}/${post.slug}` },
          ]),
        ]}
      />

      <Section bleed className="border-b border-border">
        <Container size="prose" className="py-14 md:py-20">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Blog", href: "/blog" },
              { label: cat?.label ?? post.category, href: `/blog/${post.category}` },
            ]}
            className="mb-8"
          />
          <Badge variant="muted">{cat?.label}</Badge>
          <h1 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
          <div className="mt-6 flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{author.initials}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <Link href="/about" className="font-medium underline-offset-4 hover:underline">
                {author.name}
              </Link>
              <div className="text-muted-foreground">
                <time dateTime={post.date}>{formatDate(post.date)}</time> · {readingTime(post.words)} min read
              </div>
              {post.dateModified &&
              new Date(post.dateModified).getTime() - new Date(post.date).getTime() > 86_400_000 ? (
                <div className="text-xs text-muted-foreground">
                  Updated <time dateTime={post.dateModified}>{formatDate(post.dateModified)}</time>
                </div>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container size="prose">
          <article>
            <ArticleBody blocks={post.body} affiliateDomains={affiliateDomains} relatedPosts={allPublished} />
          </article>
        </Container>
      </Section>

      <PostFooter
        post={post}
        categoryLabel={cat?.label ?? post.category}
        authorName={author.name}
        related={relatedPosts.map((p) => ({ slug: p.slug, category: p.category, title: p.title, date: p.date }))}
      />
    </>
  );
}
