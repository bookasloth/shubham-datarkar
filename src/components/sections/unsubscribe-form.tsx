"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unsubscribe } from "@/lib/subscribers/actions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UnsubscribeForm() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setError(undefined);
    setLoading(true);
    await unsubscribe(email);
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-card border border-border bg-card p-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="size-6" />
        </div>
        <h2 className="mt-5 text-xl font-bold tracking-tight">You&apos;re unsubscribed</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          If that email was on the list, it&apos;s been removed. No more newsletters. You can resubscribe anytime.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 rounded-card border border-border p-6">
      <div className="grid gap-1.5">
        <Label htmlFor="unsub-email">Email</Label>
        <Input
          id="unsub-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
          }}
          aria-invalid={!!error}
          placeholder="you@email.com"
        />
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" loading={loading} className="w-fit">
        Unsubscribe
      </Button>
    </form>
  );
}
