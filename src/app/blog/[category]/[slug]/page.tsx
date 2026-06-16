import { notFound } from "next/navigation";
import { buildMetadata, articleSchema, breadcrumbSchema } from "@/lib/seo";
import { blogCategories, author } from "@/lib/data/posts";
import { getPublishedPost, getPublishedPostsByCategory, getPublishedPosts } from "@/lib/blog/queries";
import { Container, Section } from "@/components/layout/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArticleBody } from "@/components/content/article-body";
import { ReadingProgress } from "@/components/content/reading-progress";
import { PostFooter } from "@/components/blog/post-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDate, readingTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return buildMetadata({ title: "Article", path: `/blog/${category}/${slug}` });
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.category}/${post.slug}`,
    type: "article",
    publishedTime: post.date,
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
  const others = (await getPublishedPosts()).filter(
    (p) => p.slug !== post.slug && !sameCatRelated.some((s) => s.slug === p.slug),
  );
  const relatedPosts = [...sameCatRelated, ...others].slice(0, 4);

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
              <div className="font-medium">{author.name}</div>
              <div className="text-muted-foreground">
                <time dateTime={post.date}>{formatDate(post.date)}</time> · {readingTime(post.words)} min read
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container size="prose">
          <article>
            <ArticleBody blocks={post.body} />
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
