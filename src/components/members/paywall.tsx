import Link from "next/link";
import { Lock } from "lucide-react";
import type { Visibility } from "@/lib/members/access";

export function Paywall({
  visibility,
  excerpt,
  returnPath,
}: {
  visibility: Visibility;
  excerpt: string | null;
  returnPath: string;
}) {
  const premium = visibility === "premium";

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
        <h2 className="mt-4 font-display text-lg font-semibold">
          {premium ? "This is a premium resource" : "This is a member resource"}
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {premium
            ? "Upgrade to premium to unlock this and every other premium resource."
            : "Create a free account to read this and every other member resource."}
        </p>
        <div className="mt-6 flex items-center gap-3">
          {premium ? (
            <Link
              href="/members/upgrade"
              className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
            >
              Go premium
            </Link>
          ) : (
            <Link
              href={`/members/login?next=${encodeURIComponent(returnPath)}`}
              className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
            >
              Sign in free
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
