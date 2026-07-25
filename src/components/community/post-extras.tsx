import Link from "next/link";
import type { FeedPost } from "@/lib/community/types";

/** Optional title above a Text / Quote / Link / Chat post. */
export function PostTitle({ title }: { title?: string }) {
  if (!title) return null;
  return <h3 className="mt-1 font-display text-base font-bold text-foreground">{title}</h3>;
}

/** Tag chips → filter the feed to that tag. z-10 so they clear the card overlay. */
export function PostTags({ tags }: { tags: string[] | null }) {
  if (!tags?.length) return null;
  return (
    <div className="relative z-10 mt-2 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <Link
          key={t}
          href={`/community?tag=${encodeURIComponent(t)}`}
          className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground transition-ui hover:text-foreground"
        >
          #{t}
        </Link>
      ))}
    </div>
  );
}

/** A Chat post: "Name: message" per line, rendered as a script. Lines without a
 *  speaker fall back to plain text so a stray line never disappears. */
export function ChatBody({ body }: { body: string }) {
  const lines = body.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div className="mt-2 space-y-1 rounded-card border border-border bg-muted/20 p-3 text-sm">
      {lines.map((line, i) => {
        const m = line.match(/^\s*([^:\n]{1,40}):\s+(.*)$/);
        if (!m) return <p key={i} className="text-muted-foreground">{line}</p>;
        return (
          <p key={i}>
            <span className="font-semibold text-foreground">{m[1]}</span>{" "}
            <span className="text-muted-foreground">{m[2]}</span>
          </p>
        );
      })}
    </div>
  );
}

/** A standalone Quote post (composer type 'quote', no reblog). Distinct from a
 *  quote-reblog, which renders its source via QuotedCard instead. */
export function QuoteBody({ body, source }: { body: string; source?: string }) {
  return (
    <blockquote className="mt-2 border-l-2 border-brand pl-3">
      <p className="whitespace-pre-wrap break-words text-lg font-medium text-foreground">{body}</p>
      {source && <footer className="mt-1 text-sm text-muted-foreground">— {source}</footer>}
    </blockquote>
  );
}

/** A Link post's unfurled card. z-10 so the click-through beats the card overlay. */
export function LinkCard({ meta }: { meta: NonNullable<FeedPost["meta"]> }) {
  if (!meta.url) return null;
  let host = "";
  try {
    host = new URL(meta.url).host.replace(/^www\./, "");
  } catch {
    host = meta.url;
  }
  return (
    <a
      href={meta.url}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="relative z-10 mt-2 block overflow-hidden rounded-card border border-border transition-ui hover:bg-muted/30"
    >
      {meta.link_image && (
        // Plain <img>: the source host isn't in next.config's allow-list, and an
        // unfurled OG image from an arbitrary domain can't be, so next/image
        // would reject it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meta.link_image} alt="" className="h-40 w-full object-cover" loading="lazy" />
      )}
      <div className="p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{host}</p>
        <p className="mt-0.5 font-medium text-foreground">{meta.link_title ?? meta.url}</p>
        {meta.link_desc && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{meta.link_desc}</p>
        )}
      </div>
    </a>
  );
}
