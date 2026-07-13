"use client";

import { useActionState, useState } from "react";
import { setUserPassword, type ResetPasswordState } from "@/lib/admin/user-password-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Per-user admin control: set or generate a new password. Collapsed to a button
 * until clicked. Blank field generates a temp password shown once (select-all to
 * copy). Direct set — no email, no reset link.
 */
export function ResetPassword({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    setUserPassword,
    undefined,
  );

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reset password
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex items-center gap-1.5">
        <Input
          name="password"
          type="text"
          autoComplete="off"
          placeholder="blank = generate"
          className="h-8 w-40 text-xs"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Setting…" : "Set"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>

      {state && (
        <p className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>
      )}
      {state?.ok && state.password && (
        <code className="select-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          {state.password}
        </code>
      )}
    </form>
  );
}
