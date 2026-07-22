"use client";

import { useActionState } from "react";
import { giftMembershipByEmail, type GiftState } from "@/lib/members/membership-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CELL = "h-9 rounded-btn border border-border bg-background px-2 text-sm";

export function GiftForm({
  plans,
  defaultEmail,
}: {
  plans: { key: string; name: string }[];
  defaultEmail?: string;
}) {
  const [state, action, pending] = useActionState<GiftState, FormData>(
    giftMembershipByEmail,
    undefined,
  );

  return (
    <form action={action} className="rounded-card border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Gift a plan (by email)</label>
          <Input name="email" type="email" placeholder="person@email.com" defaultValue={defaultEmail} className="h-9 w-64" required />
        </div>
        <select name="plan_key" className={`${CELL} w-44`} required defaultValue="">
          <option value="" disabled>
            Select plan…
          </option>
          {plans.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Gifting…" : "Gift membership"}
        </Button>
      </div>

      {state && (
        <p className={`mt-3 text-sm ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Lifetime access until revoked. The person must have signed in at least once. Gifts don&apos;t count toward paid members, and the recipient gets a congratulations email.
      </p>
    </form>
  );
}
