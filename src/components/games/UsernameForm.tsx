"use client";

import { useActionState } from "react";
import { renameUsername, type RenameState } from "@/lib/games/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UsernameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<RenameState, FormData>(renameUsername, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Input name="username" defaultValue={current} className="h-9 w-auto max-w-[16rem]" />
      <Button type="submit" size="sm" loading={pending}>Save</Button>
      {state && "error" in state && state.error && (
        <span className="text-sm text-danger">{state.error}</span>
      )}
      {state && "ok" in state && <span className="text-sm text-success">Saved.</span>}
    </form>
  );
}
