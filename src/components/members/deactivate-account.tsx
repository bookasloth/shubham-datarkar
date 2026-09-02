"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAccountDeactivated } from "@/lib/members/account-actions";

/**
 * Deactivate / reactivate the account (v1: reversible, no deletion). Deactivating
 * hides the account and its posts everywhere; reactivating brings them back.
 */
export function DeactivateAccount({ deactivated }: { deactivated: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(off: boolean) {
    if (
      off &&
      !confirm(
        "Deactivate your account? Your profile and posts disappear from the community until you reactivate. Nothing is deleted.",
      )
    ) {
      return;
    }
    setError(null);
    start(async () => {
      const r = await setAccountDeactivated(off);
      if (!r.ok) {
        setError(r.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

  if (deactivated) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Your account is deactivated — hidden from the community. Nothing was deleted.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(false)}
          className="rounded-btn bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-ui hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Reactivating…" : "Reactivate account"}
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Hide your profile and posts from the community. Reversible — reactivate any time. Nothing is deleted.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(true)}
        className="rounded-btn border border-border px-3 py-1.5 text-xs text-muted-foreground transition-ui hover:border-danger hover:text-danger disabled:opacity-50"
      >
        {pending ? "Deactivating…" : "Deactivate account"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
