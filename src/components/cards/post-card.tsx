import { ViewTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Post } from "@/lib/data/types";
import { blogCategories } from "@/lib/data/posts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BlueprintThumb } from "@/components/cards/blueprint-thumb";
import { formatDate, readingTime } from "@/lib/utils";

export function PostCard({ post }: { post: Post }) {
  const category = blogCategories.find((c) => c.slug === post.category);
  const href = `/blog/${post.category}/${post.slug}`;

  return (
    // Whole card is one link — thumbnail, title, and "Read more" all navigate.
    <Link href={href} className="group block h-full focus-visible:outline-none">
      <Card interactive className="flex h-full flex-col p-6">
        <div className="mb-5">
          <BlueprintThumb
            seed={post.slug}
            tags={post.tags}
            title={post.title}
            category={post.category}
            alt={post.title}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="muted">{category?.label ?? post.category}</Badge>
          <span aria-hidden>·</span>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{readingTime(post.words)} min read</span>
        </div>
        <ViewTransition name={`post-title-${post.slug}`}>
          <h3 className="mt-4 text-lg font-semibold leading-snug tracking-tight">{post.title}</h3>
        </ViewTransition>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground">
          Read more
          <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </Card>
    </Link>
  );
}
