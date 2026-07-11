"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowRight, Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signIn,
  signInWithMagicLink,
  type SignInState,
  type MagicLinkState,
} from "@/lib/auth/actions";

export function LoginForm() {
  const [magic, setMagic] = React.useState(false);
  return magic ? (
    <MagicForm onBack={() => setMagic(false)} />
  ) : (
    <PasswordForm onMagic={() => setMagic(true)} />
  );
}

function PasswordForm({ onMagic }: { onMagic: () => void }) {
  const [show, setShow] = React.useState(false);
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    undefined,
  );

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Input
            id="login-password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-btn p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Sign in
        {!pending && <ArrowRight />}
      </Button>

      <button
        type="button"
        onClick={onMagic}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Email me a sign-in link instead
      </button>
    </form>
  );
}

function MagicForm({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(
    signInWithMagicLink,
    undefined,
  );

  if (state && "ok" in state) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm text-muted-foreground" role="status">
          Check your inbox for a sign-in link. It expires shortly, so use it soon.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to password sign-in
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
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
