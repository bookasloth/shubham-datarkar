"use client";

import * as React from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EntityEditorValue = {
  slug: string | null;
  published: boolean;
  sort: number;
  data: Record<string, unknown>;
};

export function EntityEditor({
  action,
  hasSlug,
  value,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hasSlug: boolean;
  value?: EntityEditorValue;
}) {
  const [json, setJson] = React.useState(
    JSON.stringify(value?.data ?? {}, null, 2),
  );
  const [jsonError, setJsonError] = React.useState<string | null>(null);

  function onJsonChange(next: string) {
    setJson(next);
    try {
      JSON.parse(next);
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  return (
    <form action={action} className="grid max-w-3xl gap-5">
      <div className="grid grid-cols-2 gap-4">
        {hasSlug && (
          <div className="grid gap-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={value?.slug ?? ""} required />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="sort">Sort order</Label>
          <Input id="sort" name="sort" type="number" defaultValue={value?.sort ?? 0} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={value?.published ?? true} /> Published
      </label>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="data">Data (JSON)</Label>
          {jsonError && <span className="text-xs text-destructive">{jsonError}</span>}
        </div>
        <textarea
          id="data"
          name="data"
          value={json}
          onChange={(e) => onJsonChange(e.target.value)}
          spellCheck={false}
          className="min-h-[28rem] w-full rounded-btn border border-border bg-background p-3 font-mono text-xs"
        />
      </div>

      <div className="flex gap-2">
        <SubmitButton disabled={!!jsonError}>
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
