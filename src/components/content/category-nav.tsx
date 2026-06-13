import Link from "next/link";
import { blogCategories } from "@/lib/data/posts";
import { cn } from "@/lib/utils";

/** Category pills for the blog. `active` is "all" or a category slug. */
export function CategoryNav({ active = "all" }: { active?: string }) {
  const pill = "rounded-btn px-3.5 py-1.5 text-sm font-medium transition-ui";
  return (
    <nav aria-label="Blog categories" className="flex flex-wrap gap-2">
      <Link
        href="/blog"
        aria-current={active === "all" ? "page" : undefined}
        className={cn(pill, active === "all" ? "bg-foreground text-background" : "border border-border hover:bg-accent")}
      >
        All
      </Link>
      {blogCategories.map((c) => (
        <Link
          key={c.slug}
          href={`/blog/${c.slug}`}
          aria-current={active === c.slug ? "page" : undefined}
          className={cn(pill, active === c.slug ? "bg-foreground text-background" : "border border-border hover:bg-accent")}
        >
          {c.label}
        </Link>
      ))}
    </nav>
  );
}
