"use client";

import { useActionState } from "react";
import { createRequest, type RequestState } from "@/lib/members/request-actions";
import { Button } from "@/components/ui/button";

export function RequestForm() {
  const [state, formAction, pending] = useActionState<RequestState, FormData>(
    createRequest,
    undefined,
  );

  return (
    <form action={formAction} className="grid gap-3 rounded-card border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <select
          name="kind"
          defaultValue="template"
          className="h-10 rounded-input border border-input bg-background px-2.5 text-sm outline-none transition-ui focus:border-brand"
        >
          <option value="template">Template</option>
          <option value="prompt">Prompt</option>
          <option value="tool">Tool</option>
          <option value="article">Article</option>
          <option value="review">Review</option>
        </select>
        <input
          name="title"
          required
          placeholder="What do you need? One line."
          className="h-10 rounded-input border border-input bg-background px-3 text-sm outline-none transition-ui focus:border-brand"
        />
      </div>
      <textarea
        name="details"
        placeholder="Any context that helps (optional)"
        className="min-h-20 rounded-input border border-input bg-background p-3 text-sm outline-none transition-ui focus:border-brand"
      />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">Request sent. It is on the list.</p>}
      <div>
        <Button type="submit" loading={pending}>
          Send request
        </Button>
      </div>
    </form>
  );
}
