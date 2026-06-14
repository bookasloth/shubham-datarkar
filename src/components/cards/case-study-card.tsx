import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CaseStudy } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CaseStudyCard({ study }: { study: CaseStudy }) {
  return (
    <Card interactive className="group relative flex h-full flex-col p-6">
      <Badge variant="outline" className="w-fit">
        {study.sector}
      </Badge>
      <div className="mt-6">
        <div className="font-display text-4xl font-extrabold tracking-tight">{study.heroMetric.value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{study.heroMetric.label}</div>
      </div>
      <h3 className="mt-6 text-base font-semibold leading-snug">
        <Link href={`/case-studies/${study.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          {study.title}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{study.client}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
        Read case study
        <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Card>
  );
}
