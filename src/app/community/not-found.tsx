import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Renders inside community/layout.tsx (AppShell + feed column), so the shell
// stays put and only this post pane reads "gone" — Twitter-style, not a
// full-screen 404. notFound() from p/[id] resolves to this nearest boundary.
export default function PostNotFound() {
  return (
    <div>
      <h1 className="border-b border-border px-4 py-3 font-display text-lg font-bold">Post</h1>
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <p className="font-display text-lg font-bold">This post is gone</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          It may have been deleted by its author, or the link is broken. The rest of the
          community is still here.
        </p>
        <Link
          href="/community"
          className="mt-8 inline-flex items-center gap-1 rounded-btn border border-border px-3 py-1.5 text-sm transition-ui hover:bg-accent"
        >
          <ArrowLeft className="size-3" />
          Back to feed
        </Link>
      </div>
    </div>
  );
}
