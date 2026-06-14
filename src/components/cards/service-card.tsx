import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { Icon } from "@/lib/icons";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Card interactive className="group relative flex h-full flex-col p-6">
      <div className="flex size-11 items-center justify-center rounded-card bg-muted text-foreground">
        <Icon name={service.icon} />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight">{service.name}</h3>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{service.tagline}</p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{service.outcome}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-foreground">
        <Link href={`/services/${service.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          Explore service
        </Link>
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Card>
  );
}
