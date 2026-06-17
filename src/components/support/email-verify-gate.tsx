"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestOtp, verifyOtp } from "@/lib/support/comment-auth";

type Verified = { name: string };

/**
 * Email-ownership gate for commenting. Steps: enter name+email → send code →
 * enter OTP → verify. Calls onVerified(name) once the cookie is set. If the
 * server already has a verified session, the parent should skip rendering this.
 */
export function EmailVerifyGate({ onVerified }: { onVerified: (v: Verified) => void }) {
  const [stage, setStage] = React.useState<"request" | "code">("request");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function send() {
    setPending(true);
    setMsg(null);
    const res = await requestOtp(email);
    setPending(false);
    setMsg(res.message);
    if (res.ok) setStage("code");
  }

  async function verify() {
    setPending(true);
    setMsg(null);
    const res = await verifyOtp(email, name, code);
    setPending(false);
    setMsg(res.message);
    if (res.ok) onVerified({ name: name.trim() || "Anonymous" });
  }

  return (
    <div className="rounded-card border border-border bg-card p-5">
      <p className="text-sm font-semibold">Verify your email to comment</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="vg-name">Name</Label>
          <Input id="vg-name" value={name} onChange={(e) => setName(e.target.value)} disabled={stage === "code"} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="vg-email">Email</Label>
          <Input id="vg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={stage === "code"} />
        </div>
      </div>

      {stage === "code" && (
        <div className="mt-3 grid gap-1.5">
          <Label htmlFor="vg-code">6-digit code</Label>
          <Input id="vg-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}

      <div className="mt-4 flex gap-2">
        {stage === "request" ? (
          <Button type="button" size="sm" disabled={pending} onClick={send}>Send code</Button>
        ) : (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={verify}>Verify</Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={send}>Resend</Button>
          </>
        )}
      </div>
    </div>
  );
}
