"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAffiliateDomain, type DomainState } from "@/lib/content/affiliate-actions";

export function AddAffiliateDomainForm() {
  const [state, action, pending] = useActionState<DomainState, FormData>(addAffiliateDomain, undefined);

  return (
    <form action={action} className="grid gap-2">
      <div className="flex gap-2">
        <Input name="domain" placeholder="amazon.in" autoComplete="off" className="flex-1" />
        <Button type="submit" loading={pending}>
          {!pending && <Plus />}
          Add
        </Button>
      </div>
      {state && (
        <p className={`text-sm ${state.ok ? "text-success" : "text-danger"}`} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
