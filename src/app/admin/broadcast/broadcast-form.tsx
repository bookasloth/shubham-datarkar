"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckCircle2, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendBroadcast, type BroadcastState } from "@/lib/email/broadcast-actions";

type TemplateMeta = { id: string; name: string; description: string; subject: string };

export function BroadcastForm({
  templates,
  activeCount,
}: {
  templates: TemplateMeta[];
  activeCount: number;
}) {
  const [templateId, setTemplateId] = React.useState(templates[0]?.id ?? "");
  const [mode, setMode] = React.useState<"test" | "list">("test");
  const [state, action, sending] = useActionState<BroadcastState, FormData>(
    sendBroadcast,
    undefined,
  );

  const selected = templates.find((t) => t.id === templateId);

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="templateId">Template</Label>
        <select
          id="templateId"
          name="templateId"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="h-10 rounded-card border border-border bg-transparent px-3 text-sm"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {selected && (
          <p className="text-xs text-muted-foreground">
            {selected.description} · <span className="italic">Subject: {selected.subject}</span>
          </p>
        )}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Send to</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            value="test"
            checked={mode === "test"}
            onChange={() => setMode("test")}
          />
          A test address (send to yourself first)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            value="list"
            checked={mode === "list"}
            onChange={() => setMode("list")}
          />
          All active subscribers ({activeCount})
        </label>
      </fieldset>

      {mode === "test" ? (
        <div className="grid gap-1.5">
          <Label htmlFor="testEmail">Test email</Label>
          <Input id="testEmail" name="testEmail" type="email" placeholder="you@example.com" />
        </div>
      ) : (
        <label className="flex items-start gap-2 rounded-card border border-danger/40 bg-danger/5 p-3 text-sm">
          <input type="checkbox" name="confirm" className="mt-0.5" />
          <span>
            I understand this sends <strong>{selected?.name}</strong> to all {activeCount} active
            subscribers. This can&apos;t be undone.
          </span>
        </label>
      )}

      {state && (
        <div
          className={`flex items-start gap-2 text-sm ${state.ok ? "text-success" : "text-danger"}`}
          role="status"
        >
          {state.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      <Button type="submit" loading={sending} className="w-fit">
        {!sending && <Send />}
        {mode === "test" ? "Send test" : `Send to ${activeCount} subscribers`}
      </Button>
    </form>
  );
}
