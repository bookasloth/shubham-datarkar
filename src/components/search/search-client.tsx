"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { posts, blogCategories } from "@/lib/data/posts";
import { tools } from "@/lib/data/tools";
import { caseStudies } from "@/lib/data/case-studies";
import { services } from "@/lib/data/services";
import { products } from "@/lib/data/products";
import { portfolioItems } from "@/lib/data/portfolio";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type Entry = { title: string; href: string; type: string; description: string };

const index: Entry[] = [
  ...posts.map((p) => ({
    title: p.title,
    href: `/blog/${p.category}/${p.slug}`,
    type: "Article",
    description: p.excerpt,
  })),
  ...caseStudies.map((c) => ({
    title: c.title,
    href: `/case-studies/${c.slug}`,
    type: "Case study",
    description: `${c.client} · ${c.heroMetric.value} ${c.heroMetric.label}`,
  })),
  ...services.map((s) => ({ title: s.name, href: `/services/${s.slug}`, type: "Service", description: s.outcome })),
  ...tools.map((t) => ({ title: t.name, href: `/tools/${t.slug}`, type: "Tool", description: t.description })),
  ...products.map((p) => ({ title: p.name, href: `/products/${p.slug}`, type: "Product", description: p.tagline })),
  ...portfolioItems.map((p) => ({ title: p.name, href: "/work", type: "Work", description: p.description })),
  ...blogCategories.map((c) => ({ title: `${c.label} articles`, href: `/blog/${c.slug}`, type: "Category", description: c.description })),
];

export function SearchClient() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = React.useState(initial);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index.filter((e) => (e.title + " " + e.description + " " + e.type).toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, case studies, tools…"
          className="h-12 pl-10 text-base"
          aria-label="Search the site"
        />
      </div>

      <div className="mt-8">
        {!query.trim() ? (
          <EmptyState icon={<Search />} title="Search everything" description="Find articles, case studies, services, and tools across the site." />
        ) : results.length === 0 ? (
          <EmptyState
            title={`No results for “${query}”`}
            description="Try a broader term — like 'seo', 'ai', or 'roas'."
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
            </p>
            <ul className="divide-y divide-border rounded-card border border-border">
              {results.map((r) => (
                <li key={r.href + r.title}>
                  <Link href={r.href} className="group flex items-start gap-4 p-4 transition-ui hover:bg-accent">
                    <Badge variant="muted" className="mt-0.5 shrink-0">
                      {r.type}
                    </Badge>
                    <span>
                      <span className="font-medium group-hover:underline">{r.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{r.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
