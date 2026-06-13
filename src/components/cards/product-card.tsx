import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusVariant = {
  Live: "success",
  Beta: "warning",
  Building: "muted",
  Concept: "outline",
} as const;

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block focus-visible:outline-none">
      <Card
        interactive
        className="flex h-full flex-col p-6"
        style={{ ["--brand" as string]: product.color }}
      >
        <div className="flex items-start justify-between">
          {/* Single brand-color touch on the monochrome card */}
          <span className="size-3 rounded-full" style={{ backgroundColor: "var(--brand)" }} aria-hidden />
          <Badge variant={statusVariant[product.status]}>{product.status}</Badge>
        </div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight">{product.name}</h3>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{product.tagline}</p>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{product.category}</p>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-foreground">
          Explore
          <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </Card>
    </Link>
  );
}
