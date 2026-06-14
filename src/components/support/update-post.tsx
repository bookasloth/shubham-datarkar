import { Check, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { initialsOf } from "@/lib/support/config";
import { supportProfile, type UpdatePost as Post } from "@/lib/data/support-content";
import { cn } from "@/lib/utils";

/** A single creator update. Variants: text, image, checklist. */
export function UpdatePost({ post }: { post: Post }) {
  return (
    <article className="rounded-card border border-border bg-card p-5 sm:p-6">
      <header className="flex items-center gap-3">
        <Avatar className="size-9 rounded-full">
          <AvatarFallback className="rounded-full bg-foreground text-xs font-bold text-background">
            {initialsOf(supportProfile.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{supportProfile.name}</p>
          <p className="text-xs text-muted-foreground">{formatDate(post.date)}</p>
        </div>
      </header>

      <h3 className="mt-4 font-display text-lg font-bold tracking-tight">{post.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.body}</p>

      {post.variant === "image" && (
        <div
          className="mt-4 flex aspect-[16/9] items-center justify-center rounded-img border border-border bg-muted/50"
          role="img"
          aria-label={post.imageAlt}
        >
          <ImageIcon className="size-8 text-muted-foreground" />
        </div>
      )}

      {post.variant === "checklist" && (
        <ul className="mt-4 flex flex-col gap-2">
          {post.items.map((it) => (
            <li
              key={it.label}
              className="flex items-center gap-3 rounded-input border border-border bg-background px-3 py-2.5 text-sm"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  it.done ? "border-foreground bg-foreground text-background" : "border-border text-transparent",
                )}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span className={cn(it.done && "text-muted-foreground line-through")}>{it.label}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
