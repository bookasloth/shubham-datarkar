import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/layout/container";
import { NewsletterForm } from "@/components/sections/newsletter-form";
import { ShareBar } from "./share-bar";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/utils";

type RelatedItem = { slug: string; category: string; title: string; date: string };

/**
 * Post-footer block: meta + share bar, comments CTA, Read Next, newsletter.
 * Comment wiring lands later — the count + button are UI-only for now.
 */
export function PostFooter({
  post,
  categoryLabel,
  authorName,
  related,
  commentCount = 0,
}: {
  post: { slug: string; category: string; title: string };
  categoryLabel: string;
  authorName: string;
  related: RelatedItem[];
  commentCount?: number;
}) {
  const url = `${site.url}/blog/${post.category}/${post.slug}`;

  return (
    <Section>
      <Container size="prose">
        {/* Meta + share */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              by{" "}
              <Link href="/about" className="font-medium text-foreground underline-offset-4 hover:underline">
                {authorName}
              </Link>
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="size-4" />
              {commentCount}
            </span>
            <Badge variant="muted">{categoryLabel}</Badge>
          </div>
          <ShareBar url={url} title={post.title} />
        </div>

        {/* Comments CTA */}
        <div className="flex flex-col gap-6 border-b border-border py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-sm">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Comments</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Join the discussion and share your opinion</h2>
          </div>
          <Button size="lg" className="shrink-0">
            Add a Comment
          </Button>
        </div>

        {/* Read Next */}
        {related.length > 0 && (
          <div className="border-b border-border py-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Read Next</p>
            <ul className="mt-5 flex flex-col gap-4">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.category}/${p.slug}`} className="group inline-flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-bold tracking-tight group-hover:underline">{p.title}</span>
                    <span className="text-sm text-muted-foreground">/ {formatDate(p.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Newsletter */}
        <div className="py-10">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Newsletter</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Never miss the next one</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Get the latest playbooks, build logs, and the occasional unpublished idea straight to your inbox. One
            signal a week — no noise.
          </p>
          <NewsletterForm className="mt-5 max-w-xl" />
        </div>
      </Container>
    </Section>
  );
}
