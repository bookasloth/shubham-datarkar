"use client";

import * as React from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({
  variant = "inline",
  className,
}: {
  variant?: "inline" | "block";
  className?: string;
}) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    // Placeholder: swap for a real ConvertKit/Resend call later.
    await new Promise((r) => setTimeout(r, 800));
    setStatus("success");
    toast({ title: "You're on the list", description: "Check your inbox to confirm.", variant: "success" });
  }

  if (status === "success") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-input border border-success/30 bg-success/8 px-4 py-3 text-sm",
          className,
        )}
        role="status"
      >
        <Check className="size-4 text-success" />
        <span>Subscribed. One signal every Tuesday — no noise.</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn(variant === "inline" ? "flex flex-col gap-2 sm:flex-row" : "flex flex-col gap-2", className)}
    >
      <div className="flex-1">
        <label htmlFor={`nl-${variant}`} className="sr-only">
          Email address
        </label>
        <Input
          id={`nl-${variant}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? `nl-${variant}-err` : undefined}
        />
        {status === "error" && (
          <p id={`nl-${variant}-err`} className="mt-1.5 text-xs text-danger" role="alert">
            Enter a valid email address.
          </p>
        )}
      </div>
      <Button type="submit" loading={status === "loading"} className={variant === "block" ? "w-full" : ""}>
        Subscribe
        {status !== "loading" && <ArrowRight />}
      </Button>
    </form>
  );
}
