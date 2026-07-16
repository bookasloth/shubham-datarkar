"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { PasswordField } from "@/components/app/password-field";
import { cn } from "@/lib/utils";
import {
  signIn,
  signUp,
  signInWithMagicLink,
  type SignInState,
  type MagicLinkState,
} from "@/lib/auth/actions";

type View = "signin" | "signup" | "magic";

/** Per-view chrome. The signup view carries the full wordmark; the returning
 *  flows (signin/magic) carry the compact square mark. */
const HEADINGS: Record<View, { title: string; sub: string; wordmark: boolean }> = {
  signin: { title: "Welcome back", sub: "Sign in to your account.", wordmark: false },
  signup: { title: "Create your account", sub: "Join in a few seconds.", wordmark: true },
  magic: { title: "Sign in with a link", sub: "We'll email you a one-time link.", wordmark: false },
};

export function LoginForm({
  next = "",
  initialView = "signin",
  check,
  reset,
  errorParam,
}: {
  next?: string;
  initialView?: "signin" | "signup";
  check?: boolean;
  reset?: boolean;
  errorParam?: string;
}) {
  const [view, setView] = React.useState<View>(initialView);
  // Lifted so the address survives switching between password / magic-link views.
  const [email, setEmail] = React.useState("");
  const h = HEADINGS[view];

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo showWordmark={h.wordmark} />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{h.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{h.sub}</p>
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
            key={view}
            signup={view === "signup"}
            next={next}
            email={email}
            setEmail={setEmail}
            onSwap={() => setView(view === "signup" ? "signin" : "signup")}
            onMagic={() => setView("magic")}
          />
        )}
      </Card>

      {view === "signin" && (
        <p className="mt-3 text-center text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            Forgot your password?
          </Link>
        </p>
      )}
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
  signup,
  next,
  email,
  setEmail,
  onSwap,
  onMagic,
}: {
  signup: boolean;
  next: string;
  email: string;
  setEmail: (v: string) => void;
  onSwap: () => void;
  onMagic: () => void;
}) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signup ? signUp : signIn,
    undefined,
  );
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const errRef = React.useRef<HTMLParagraphElement>(null);

  const mismatch = signup && confirm.length > 0 && confirm !== pw;

  React.useEffect(() => {
    if (state?.error) errRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />

      {signup && (
        <div className="grid gap-1.5">
          <Label htmlFor="signup-name">
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            autoFocus
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          autoFocus={!signup}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <PasswordField
        id="login-password"
        name="password"
        label="Password"
        autoComplete={signup ? "new-password" : "current-password"}
        placeholder={signup ? "At least 8 characters" : "••••••••"}
        required
        meter={signup}
        onValueChange={setPw}
      />

      {signup && (
        <div className="grid gap-1.5">
          <PasswordField
            id="signup-confirm"
            name="password2"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            required
            onValueChange={setConfirm}
          />
          {mismatch && (
            <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
          )}
        </div>
      )}

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

      <Button type="submit" size="lg" loading={pending} disabled={mismatch} className="w-full">
        {signup ? "Create account" : "Sign in"}
        {!pending && <ArrowRight />}
      </Button>

      {signup && (
        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link
            href="/terms-of-use"
            className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      )}

      <Divider />

      <div className="grid gap-2 text-center text-sm">
        <button
          type="button"
          onClick={onMagic}
          className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
        >
          Email me a sign-in link instead
        </button>
        <button
          type="button"
          onClick={onSwap}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {signup ? "Already have an account? Sign in" : "New here? Create a free account"}
        </button>
      </div>
    </form>
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
