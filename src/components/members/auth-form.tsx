"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type MembersAuthState } from "@/lib/members/auth-actions";
import { Button } from "@/components/ui/button";

export default function MembersAuthForm({
  next,
  initialMode = "in",
}: {
  next: string;
  initialMode?: "in" | "up";
}) {
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<MembersAuthState, FormData>(
    action,
    undefined,
  );

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-card border border-border bg-card p-6">
      <h1 className="font-display text-xl font-bold">
        {mode === "in" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "in"
          ? "Log in to your member workspace."
          : "Free account. Bookmarks, progress, and member resources."}
      </p>

      <form action={formAction} className="mt-5 space-y-3">
        <input type="hidden" name="next" value={next} />
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-input border border-input bg-background px-3 py-2 text-sm outline-none transition-ui focus:border-brand"
        />
        <input
          name="password"
          type="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          required
          placeholder="Password"
          className="w-full rounded-input border border-input bg-background px-3 py-2 text-sm outline-none transition-ui focus:border-brand"
        />
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <Button type="submit" loading={pending} className="w-full">
          {mode === "in" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}
        className="mt-4 text-sm text-muted-foreground underline-offset-4 transition-ui hover:text-foreground hover:underline"
      >
        {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
