import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Nudge an email-only visitor to create a verified account. No auto-account. */
export function CreateAccountCTA({ message }: { message: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-1 text-center">
      <p className="text-xs text-muted-foreground">{message}</p>
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:opacity-80"
      >
        Create your free account <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
