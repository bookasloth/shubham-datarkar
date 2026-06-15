import { ArrowUpRight } from "lucide-react";
import type { Platform } from "@/lib/data/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/lib/icons";

/** Venture/platform card — the whole card links out to the original site. */
export function PlatformCard({ platform }: { platform: Platform }) {
  return (
    <a
      href={platform.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block focus-visible:outline-none"
    >
      <Card interactive className="flex h-full flex-col p-6">
        <div className="flex items-start justify-between">
          <span
            className="grid size-11 place-items-center rounded-card"
            style={{ background: platform.accent }}
          >
            <Icon name={platform.icon} className="size-5 text-zinc-900" />
          </span>
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <div className="mt-5 flex items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{platform.name}</h3>
          <Badge variant="muted">{platform.category}</Badge>
        </div>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{platform.blurb}</p>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{platform.description}</p>
      </Card>
    </a>
  );
}
