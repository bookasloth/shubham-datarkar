import Image from "next/image";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import type { QuotedPost } from "@/lib/community/types";

/**
 * The inset source card a quote reblog wraps. Non-interactive except a single
 * click-through to the source permalink — it deliberately renders no engagement
 * bar, no menu, and only the first image, so it reads as a citation, not a
 * second live post.
 *
 * `relative z-10` sits it above the card-wide click overlay, so clicking the
 * embed opens the SOURCE rather than the quoting post.
 */
export function QuotedCard({ quoted }: { quoted: QuotedPost }) {
  return (
    <Link
      href={`/community/p/${quoted.publicId}`}
      className="relative z-10 mt-2 block overflow-hidden rounded-card border border-border bg-muted/20 p-3 transition-ui hover:bg-muted/40"
    >
      <div className="flex items-center gap-1 text-xs">
        <span className="font-semibold text-foreground">@{quoted.username}</span>
        <span className="text-muted-foreground">· {timeAgo(quoted.createdAt)}</span>
      </div>

      {quoted.body && (
        <p className="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {quoted.body}
        </p>
      )}

      {quoted.type === "image" && quoted.images?.length ? (
        <div className="mt-2 overflow-hidden rounded-input border border-border bg-muted">
          <Image
            src={quoted.images[0]}
            alt=""
            width={800}
            height={800}
            sizes="(max-width: 640px) 90vw, 520px"
            className="h-auto w-full"
          />
        </div>
      ) : null}
    </Link>
  );
}
