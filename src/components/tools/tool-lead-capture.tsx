"use client";

import * as React from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribe } from "@/lib/subscribers/actions";
import { EMAIL_RE } from "@/lib/validation/email";
import { cn } from "@/lib/utils";

/**
 * Email capture at the high-intent moment on a tool — subscribes to the Builders
 * List (tagged with the tool as source). `onSuccess` lets a caller unlock gated
 * content once the visitor is on the list (used by the SEO audit's full report).
 * Honest: it never withholds the value already shown, only offers more.
 */
export function ToolLeadCapture({
  source,
  title,
  blurb,
  cta = "Join the Builders List",
  onSuccess,
  className,
}: {
  source: string;
  title: string;
  blurb: string;
  cta?: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    const res = await subscribe(email, `tool:${source}`);
    if (!res.ok) {
      setError(res.error ?? "Couldn't subscribe. Try again.");
      setStatus("error");
      return;
    }
    setStatus("success");
    onSuccess?.();
  }

  if (status === "success") {
    return (
      <div className={cn("flex items-center gap-2 rounded-card border border-success/30 bg-success/8 p-4 text-sm", className)} role="status">
        <Check className="size-4 text-success" />
        You&rsquo;re on the list — one signal every Tuesday, no noise.
      </div>
    );
  }

  return (
    <div className={cn("rounded-card border border-border bg-card p-5", className)}>
      <p className="font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="you@company.com"
          className="flex-1"
          aria-invalid={status === "error"}
        />
        <Button type="submit" loading={status === "loading"} className="shrink-0">
          {cta}
          {status !== "loading" && <ArrowRight />}
        </Button>
      </form>
      {status === "error" && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
