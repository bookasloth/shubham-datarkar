"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Mail, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { PasswordField } from "@/components/app/password-field";
import { cn } from "@/lib/utils";
import {
  signIn,
  signInWithMagicLink,
  resendConfirmation,
  type SignInState,
  type MagicLinkState,
  type ResendState,
} from "@/lib/auth/actions";

type View = "signin" | "magic";

/** Per-view chrome. */
const HEADINGS: Record<View, { title: string; sub: string; wordmark: boolean }> = {
  signin: { title: "Welcome back", sub: "Sign in to continue to your account.", wordmark: true },
  magic: { title: "Sign in with a link", sub: "We'll email you a one-time link.", wordmark: true },
};

export function LoginForm({
  next = "",
  check,
  reset,
  errorParam,
}: {
  next?: string;
  check?: boolean;
  reset?: boolean;
  errorParam?: string;
}) {
  const [view, setView] = React.useState<View>("signin");
  // Lifted so the address survives switching between password / magic-link views.
  const [email, setEmail] = React.useState("");
  const h = HEADINGS[view];

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo showWordmark={h.wordmark} />
        <h1 className="mt-5 text-3xl font-bold tracking-tight">{h.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{h.sub}</p>
      </div>

      {check && (
        <Banner role="status">
          Almost there — check your email and confirm your address to finish
          signing up.
        </Banner>
      )}
      {reset && (
        <Banner role="status">Password updated. Sign in with your new password.</Banner>
      )}
      {errorParam === "link" && (
        <Banner role="alert" tone="error">
          That sign-in link was invalid or expired. Request a new one.
        </Banner>
      )}

      <Card className="p-6">
        {view === "magic" ? (
          <MagicForm
            next={next}
            email={email}
            setEmail={setEmail}
            onBack={() => setView("signin")}
          />
        ) : (
          <CredentialsForm
            next={next}
            email={email}
            setEmail={setEmail}
            onMagic={() => setView("magic")}
          />
        )}
      </Card>

    </div>
  );
}

/** Dismissible status/error banner (URL-driven, so let the reader close it). */
function Banner({
  children,
  role,
  tone = "muted",
}: {
  children: React.ReactNode;
  role: "status" | "alert";
  tone?: "muted" | "error";
}) {
  const [open, setOpen] = React.useState(true);
  if (!open) return null;
  return (
    <div
      role={role}
      className={cn(
        "relative mb-4 rounded-card border bg-card p-3 pr-9 text-center text-sm",
        tone === "error"
          ? "border-destructive/40 text-destructive"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Dismiss"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-btn p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function CredentialsForm({
  next,
  email,
  setEmail,
  onMagic,
}: {
  next: string;
  email: string;
  setEmail: (v: string) => void;
  onMagic: () => void;
}) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, undefined);
  const [resendState, resendAction] = useActionState<ResendState, FormData>(resendConfirmation, undefined);
  const errRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    if (state?.error) errRef.current?.focus();
  }, [state]);

  return (
    <>
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="grid gap-1.5">
        <Label htmlFor="login-email">Email address</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail />}
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <PasswordField
        id="login-password"
        name="password"
        label="Password"
        autoComplete="current-password"
        placeholder="••••••••"
        icon={<Lock />}
        required
      />

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            name="remember"
            defaultChecked
            className="data-[state=checked]:!border-[#FE5100] data-[state=checked]:!bg-[#FE5100] data-[state=checked]:!text-white"
          />
          Remember me
        </label>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-[#FE5100] underline-offset-4 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      {state?.error && (
        <p
          ref={errRef}
          tabIndex={-1}
          className="text-sm text-destructive outline-none"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Sign in
        {!pending && <ArrowRight />}
      </Button>

      <Divider />

      <div className="grid gap-2 text-center text-sm">
        <button
          type="button"
          onClick={onMagic}
          className="font-medium text-[#FE5100] underline-offset-4 hover:underline"
        >
          Email me a sign-in link instead
        </button>
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="text-muted-foreground underline-offset-4 hover:text-foreground"
        >
          New here?{" "}
          <span className="font-medium text-[#FE5100] hover:underline">Create a free account</span>
        </Link>
      </div>
    </form>

    {/* Sibling of the credentials form (not nested — nested forms are invalid
        HTML). Shown only after the login gate flags an unverified account. */}
    {state?.needsVerification && (
      <form action={resendAction} className="mt-3 text-center">
        <input type="hidden" name="email" value={email} />
        <button type="submit" className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground">
          {resendState && "ok" in resendState ? "Verification email sent — check your inbox." : "Resend verification email"}
        </button>
      </form>
    )}
    </>
  );
}

function MagicForm({
  next,
  email,
  setEmail,
  onBack,
}: {
  next: string;
  email: string;
  setEmail: (v: string) => void;
  onBack: () => void;
}) {
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(
    signInWithMagicLink,
    undefined,
  );
  const errRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    if (state && "error" in state) errRef.current?.focus();
  }, [state]);

  if (state && "ok" in state) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm text-muted-foreground" role="status">
          Check your inbox for a sign-in link. It expires shortly, so use it soon.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
        >
          Back to password sign-in
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-1.5">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {state?.error && (
        <p
          ref={errRef}
          tabIndex={-1}
          className="text-sm text-destructive outline-none"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Email me a sign-in link
        {!pending && <Mail />}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Sign in with a password instead
      </button>
    </form>
  );
}

function Divider() {
  return (
    <div className="relative py-1 text-center">
      <span aria-hidden className="absolute left-0 top-1/2 h-px w-full bg-border" />
      <span className="relative z-10 bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">
        or
      </span>
    </div>
  );
}
