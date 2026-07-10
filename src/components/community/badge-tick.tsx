import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Badge } from "@/lib/community/types";

export function BadgeTick({ badge }: { badge: Badge }) {
  return (
    <span
      className={cn(
        "inline-flex size-4 items-center justify-center rounded-full transition-ui",
        badge === "gold" && "text-gold",
        badge === "orange" && "text-brand",
        badge === "grey" &&
          "text-muted-foreground hover:bg-brand hover:text-brand-foreground",
      )}
      title={badge === "gold" ? "Founder" : badge === "orange" ? "Supporter" : "Verified"}
    >
      <BadgeCheck className="size-3.5" strokeWidth={2.5} />
    </span>
  );
}
