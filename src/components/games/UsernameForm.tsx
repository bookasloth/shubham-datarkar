"use client";

import { useActionState } from "react";
import { renameUsername, type RenameState } from "@/lib/games/profile-actions";
import { Button } from "@/components/ui/button";

export default function UsernameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<RenameState, FormData>(renameUsername, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="username"
        defaultValue={current}
        className="rounded-input border border-input bg-background px-3 py-1.5 text-sm outline-none transition-ui focus:border-brand"
      />
      <Button type="submit" size="sm" loading={pending}>Save</Button>
      {state && "error" in state && state.error && (
        <span className="text-sm text-danger">{state.error}</span>
      )}
      {state && "ok" in state && <span className="text-sm text-success">Saved.</span>}
    </form>
  );
}
