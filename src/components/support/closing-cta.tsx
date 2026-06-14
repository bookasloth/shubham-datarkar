import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Closing invitation on the Supporters page — routes to the about page. */
export function ClosingCta() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-card p-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-btn border border-border bg-muted/50">
        <Sparkles className="size-5" />
      </span>
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">Curious who you&apos;re supporting?</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          The story behind the companies, the writing, and why any of this exists.
        </p>
      </div>
      <Link href="/about" className={cn(buttonVariants({ size: "lg" }))}>
        Read my story
        <ArrowRight />
      </Link>
    </div>
  );
}
