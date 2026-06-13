import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buildMetadata, articleSchema, breadcrumbSchema } from "@/lib/seo";
import { posts, getPost, blogCategories, author } from "@/lib/data/posts";
import { Container, Section } from "@/components/layout/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArticleBody } from "@/components/content/article-body";
import { PostCard } from "@/components/cards/post-card";
import { NewsletterForm } from "@/components/sections/newsletter-form";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { formatDate, readingTime } from "@/lib/utils";

export function generateStaticParams() {
  return posts.map((p) => ({ category: p.category, slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const post = getPost(slug);
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
  const post = getPost(slug);
  if (!post || post.category !== category) notFound();

  const cat = blogCategories.find((c) => c.slug === post.category);
  const related = posts.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);
  const fallback = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const relatedPosts = related.length ? related : fallback;

  return (
    <>
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

          <Separator className="my-12" />

          {/* Author card */}
          <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 sm:flex-row sm:items-center">
            <Avatar className="size-14">
              <AvatarFallback className="text-base">{author.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{author.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {author.role}. Building compounding growth systems and shipping SaaS at the intersection of marketing,
                product, and AI.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium hover:gap-2">
              <ArrowLeft className="size-4" />
              Back to all articles
            </Link>
          </div>
        </Container>
      </Section>

      {/* Newsletter */}
      <Section bleed className="border-y border-border bg-card py-16">
        <Container size="narrow">
          <div className="rounded-card border border-border bg-background p-8 text-center">
            <h2 className="text-xl font-bold tracking-tight">Enjoyed this?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Get the next one in your inbox — one idea every Tuesday, no noise.
            </p>
            <NewsletterForm className="mx-auto mt-5 max-w-md" />
          </div>
        </Container>
      </Section>

      {/* Related */}
      <Section>
        <Container>
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Keep reading</h2>
            <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-medium hover:gap-2">
              All articles <ArrowRight className="size-4" />
            </Link>
          </div>
          <Reveal>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedPosts.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
