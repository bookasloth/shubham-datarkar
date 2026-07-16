"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/app/password-field";
import { updatePassword, type UpdatePasswordState } from "@/lib/auth/actions";

export function ResetPasswordForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState<UpdatePasswordState, FormData>(
    updatePassword,
    undefined,
  );
  const errRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    if (state?.error) errRef.current?.focus();
  }, [state]);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="code" value={code} />

      <PasswordField
        id="new-password"
        name="password"
        label="New password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        required
        autoFocus
        meter
      />

      {state?.error && (
        <p ref={errRef} tabIndex={-1} className="text-sm text-destructive outline-none" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Update password
        {!pending && <ArrowRight />}
      </Button>
    </form>
  );
}
