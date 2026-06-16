"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckCircle2, XCircle, PlugZap, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ZOHO_FIELDS } from "@/lib/zoho/config";
import type { ZohoStatus } from "@/lib/zoho/store";
import {
  saveZohoCredentials,
  testZohoConnection,
  type SaveState,
  type TestState,
} from "@/lib/zoho/actions";

export function ZohoIntegrationForm({ status }: { status: ZohoStatus }) {
  const [live, setLive] = React.useState(status.mode === "live");

  const [saveState, saveAction, saving] = useActionState<SaveState, FormData>(
    saveZohoCredentials,
    undefined,
  );
  const [testState, testAction, testing] = useActionState<TestState, FormData>(
    testZohoConnection,
    undefined,
  );

  const setFields = new Set(status.setFields);

  return (
    <div className="grid gap-6">
      {/* Status summary */}
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-border p-4">
        <Badge variant={status.configured ? "success" : "muted"}>
          {status.configured ? "Configured" : "Not configured"}
        </Badge>
        <Badge variant="outline">{status.mode === "live" ? "Live" : "Sandbox"}</Badge>
        {status.lastTestAt && (
          <span className="text-xs text-muted-foreground">
            Last test {new Date(status.lastTestAt).toLocaleString()} —{" "}
            <span className={status.lastTestOk ? "text-success" : "text-danger"}>
              {status.lastTestOk ? "passed" : "failed"}
            </span>
          </span>
        )}
      </div>

      {/* Save credentials */}
      <form action={saveAction} className="grid gap-4">
        <input type="hidden" name="mode" value={live ? "live" : "sandbox"} />

        <label className="flex items-center justify-between gap-3 rounded-card border border-border p-4">
          <span>
            <span className="text-sm font-medium">Live mode</span>
            <span className="block text-xs text-muted-foreground">
              Off = sandbox (paymentssandbox.zoho.in). Test here before going live.
            </span>
          </span>
          <Switch checked={live} onCheckedChange={setLive} aria-label="Live mode" />
        </label>

        {ZOHO_FIELDS.map((f) => {
          const saved = setFields.has(f.key);
          return (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`zoho-${f.key}`}>
                {f.label}
                {saved && (
                  <span className="ml-2 font-normal text-xs text-success">saved</span>
                )}
              </Label>
              <Input
                id={`zoho-${f.key}`}
                name={f.key}
                type={f.secret ? "password" : "text"}
                autoComplete="off"
                placeholder={saved ? "•••••••• — leave blank to keep" : "Paste value"}
              />
              <p className="text-xs text-muted-foreground">{f.help}</p>
            </div>
          );
        })}

        {saveState && (
          <p
            className={`text-sm ${saveState.ok ? "text-success" : "text-danger"}`}
            role="alert"
          >
            {saveState.message}
          </p>
        )}

        <Button type="submit" loading={saving} className="w-fit">
          {!saving && <Save />}
          Save credentials
        </Button>
      </form>

      {/* Test connect */}
      <form action={testAction} className="grid gap-3 border-t border-border pt-6">
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="outline"
            loading={testing}
            disabled={!status.configured}
          >
            {!testing && <PlugZap />}
            Test Connect
          </Button>
          {!status.configured && (
            <span className="text-xs text-muted-foreground">
              Save credentials first.
            </span>
          )}
        </div>

        {testState && (
          <div
            className={`flex items-start gap-2 text-sm ${
              testState.ok ? "text-success" : "text-danger"
            }`}
            role="status"
          >
            {testState.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{testState.message}</span>
          </div>
        )}
      </form>
    </div>
  );
}
