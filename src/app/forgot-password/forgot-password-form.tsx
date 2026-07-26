"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type ResetRequestState } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    undefined,
  );
  const errRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    if (state && "error" in state) errRef.current?.focus();
  }, [state]);

  if (state && "ok" in state) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        If an account exists for that email, a reset link is on its way. Check
        your inbox (and spam).
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail />}
          required
          autoFocus
        />
      </div>

      {state?.error && (
        <p ref={errRef} tabIndex={-1} className="text-sm text-destructive outline-none" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="brand" size="lg" loading={pending} className="w-full">
        Send reset link
        {!pending && <ArrowRight />}
      </Button>
    </form>
  );
}
