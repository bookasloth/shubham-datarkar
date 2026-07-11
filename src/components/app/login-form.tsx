"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowRight, Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signIn,
  signUp,
  signInWithMagicLink,
  type SignInState,
  type MagicLinkState,
} from "@/lib/auth/actions";

type View = "signin" | "signup" | "magic";
type CredentialsAction = (state: SignInState, form: FormData) => Promise<SignInState>;

export function LoginForm({ next = "" }: { next?: string }) {
  const [view, setView] = React.useState<View>("signin");

  if (view === "magic") {
    return <MagicForm next={next} onBack={() => setView("signin")} />;
  }
  const signup = view === "signup";
  return (
    <CredentialsForm
      key={view}
      signup={signup}
      next={next}
      action={signup ? signUp : signIn}
      onSwap={() => setView(signup ? "signin" : "signup")}
      onMagic={() => setView("magic")}
    />
  );
}

function CredentialsForm({
  signup,
  next,
  action,
  onSwap,
  onMagic,
}: {
  signup: boolean;
  next: string;
  action: CredentialsAction;
  onSwap: () => void;
  onMagic: () => void;
}) {
  const [show, setShow] = React.useState(false);
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
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
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder={signup ? "At least 8 characters" : "••••••••"}
            required
            minLength={signup ? 8 : undefined}
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
        {signup ? "Create account" : "Sign in"}
        {!pending && <ArrowRight />}
      </Button>

      <div className="grid gap-2 text-center text-sm">
        <button
          type="button"
          onClick={onMagic}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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

function MagicForm({ next, onBack }: { next: string; onBack: () => void }) {
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
      <input type="hidden" name="next" value={next} />
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
