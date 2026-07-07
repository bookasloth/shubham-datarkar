"use client";

import { useActionState } from "react";
import { cancelMembership, type CancelState } from "@/lib/members/membership-actions";

export function CancelMembershipButton() {
  const [state, formAction, pending] = useActionState<CancelState, FormData>(
    cancelMembership,
    undefined,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Cancel your premium membership? Access continues until the period ends.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-btn border border-border px-3 py-1.5 text-xs text-muted-foreground transition-ui hover:border-danger hover:text-danger disabled:opacity-50"
      >
        {pending ? "Cancelling…" : "Cancel membership"}
      </button>
      {state?.error && <p className="mt-2 text-xs text-danger">{state.error}</p>}
      {state?.ok && (
        <p className="mt-2 text-xs text-muted-foreground">
          Cancelled. Access runs until the end of the paid period.
        </p>
      )}
    </form>
  );
}
