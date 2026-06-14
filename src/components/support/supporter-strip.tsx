import { Heart } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialsOf } from "@/lib/support/config";
import type { RecentSupporter } from "@/lib/support/queries";

const displayName = (name: string | null) => name ?? "A supporter";

/** Light social proof under the support button. */
export function SupporterStrip({ supporters }: { supporters: RecentSupporter[] }) {
  if (!supporters.length) return null;
  const shown = supporters.slice(0, 5);
  const extra = Math.max(0, supporters.length - shown.length);
  const lead = supporters[0]?.name?.split(" ")[0] ?? "Someone";
  const others = Math.max(0, supporters.length - 1);

  return (
    <div className="mt-6 flex items-center gap-3 rounded-card border border-border bg-card p-4">
      <div className="flex -space-x-2">
        {shown.map((s) => (
          <Avatar key={s.id} className="size-8 rounded-full ring-2 ring-card">
            <AvatarFallback className="rounded-full text-[10px] font-semibold">
              {initialsOf(displayName(s.name))}
            </AvatarFallback>
          </Avatar>
        ))}
        {extra > 0 && (
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
            +{extra}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{lead}</span>
        {others > 0 ? ` and ${others} others supported recently.` : " supported recently."}
      </p>
      <Heart className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
