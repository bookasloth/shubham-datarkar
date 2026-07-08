import Link from "next/link";
import { Lock } from "lucide-react";

export function Paywall({
  excerpt,
  returnPath,
  signedIn,
}: {
  excerpt: string | null;
  returnPath: string;
  signedIn: boolean;
}) {
  return (
    <div className="space-y-6">
      {excerpt && (
        <div className="relative">
          <p className="text-base leading-relaxed text-muted-foreground">{excerpt}</p>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <div className="flex flex-col items-center rounded-card border border-border bg-card px-6 py-12 text-center shadow-xs">
        <div className="flex size-12 items-center justify-center rounded-card bg-muted">
          <Lock className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold">This is a Member resource</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          Become a Member to unlock this and the complete library.
        </p>
        <div className="mt-6 flex items-center gap-3">
          {signedIn ? (
            <Link
              href="/members/upgrade"
              className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
            >
              Become a Member
            </Link>
          ) : (
            <Link
              href={`/members/login?next=${encodeURIComponent(returnPath)}`}
              className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/members/explore"
            className="rounded-btn border border-border px-4 py-2 text-sm transition-ui hover:bg-accent"
          >
            Browse free resources
          </Link>
        </div>
      </div>
    </div>
  );
}
