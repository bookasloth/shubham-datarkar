import Link from "next/link";
import { Check, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { initialsOf } from "@/lib/support/config";
import { supportProfile } from "@/lib/data/support-content";
import type { SupportUpdate } from "@/lib/support/update-code";

/** The supporter being thanked (real name or anonymous alias), for the chip. */
function supporterName(u: SupportUpdate): string | null {
  if (u.type === "thankyou" && u.author) {
    return "name" in u.author ? u.author.name : u.author.alias;
  }
  return null;
}

/** A single update in the feed. Links to its own page. Variants: text/image/video/thankyou. */
export function UpdateCard({ update }: { update: SupportUpdate }) {
  // Every post — including the auto thank-you — is authored by Shubham.
  const name = supportProfile.name;
  const supporter = supporterName(update);
  const media = update.media as Record<string, string>;

  return (
    <Link
      href={`/support/updates/${update.code}`}
      className="block rounded-card border border-border bg-card p-5 transition-colors hover:border-foreground/30 sm:p-6"
    >
      <header className="flex items-center gap-3">
        <Avatar className="size-9 rounded-full">
          <AvatarImage src={supportProfile.photo} alt={name} />
          <AvatarFallback className="rounded-full bg-foreground text-xs font-bold text-background">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{name}</p>
          <p className="text-xs text-muted-foreground">{formatDate(update.createdAt)}</p>
        </div>
      </header>

      {update.body && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{update.body}</p>
      )}

      {(update.type === "image" || update.type === "thankyou") && media.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt=""
          className="mt-4 w-full rounded-img border border-border object-cover"
        />
      )}
      {(update.type === "image" || update.type === "thankyou") && !media.url && (
        <div className="mt-4 flex aspect-[16/9] items-center justify-center rounded-img border border-border bg-muted/50">
          <ImageIcon className="size-8 text-muted-foreground" />
        </div>
      )}

      {update.type === "video" && media.embedUrl && (
        <div className="mt-4 aspect-video overflow-hidden rounded-img border border-border">
          <iframe
            src={media.embedUrl}
            title="Video"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {update.type === "thankyou" && (
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          <Check className="size-3" strokeWidth={3} /> New supporter{supporter ? `: ${supporter}` : ""}
        </span>
      )}
    </Link>
  );
}
