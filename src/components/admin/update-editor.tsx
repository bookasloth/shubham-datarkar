"use client";

import * as React from "react";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createUpdate, type ActionState } from "@/lib/support/updates-actions";

const TYPES = [
  { key: "text", label: "Text" },
  { key: "image", label: "Image + caption" },
  { key: "video", label: "Video + caption" },
] as const;

export function UpdateEditor() {
  const [state, action] = useActionState<ActionState, FormData>(createUpdate, undefined);
  const [type, setType] = React.useState<(typeof TYPES)[number]["key"]>("text");

  return (
    <form action={action} className="grid max-w-2xl gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="rounded-input border border-border bg-background px-3 py-2 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="body">{type === "text" ? "Text" : "Caption"}</Label>
        <textarea
          id="body"
          name="body"
          rows={5}
          className="rounded-input border border-border bg-background p-3 text-sm"
        />
      </div>

      {type === "image" && (
        <div className="grid gap-1.5">
          <Label htmlFor="image">Image</Label>
          <input id="image" name="image" type="file" accept="image/*" className="text-sm" />
        </div>
      )}

      {type === "video" && (
        <div className="grid gap-1.5">
          <Label htmlFor="videoUrl">YouTube / Vimeo URL</Label>
          <Input id="videoUrl" name="videoUrl" placeholder="https://youtu.be/..." />
        </div>
      )}

      {state && (
        <p className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
          {state.message}
        </p>
      )}

      <div>
        <SubmitButton>Post</SubmitButton>
      </div>
    </form>
  );
}
