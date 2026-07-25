"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { PasswordField } from "@/components/app/password-field";
import { signUp, type SignInState } from "@/lib/auth/actions";

export function RegisterForm({ next = "" }: { next?: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signUp, undefined);
  const errRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    if (state?.error) errRef.current?.focus();
  }, [state]);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo showWordmark />
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Join in a few seconds.</p>
      </div>

      <Card className="p-6">
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="next" value={next} />

          <div className="grid gap-1.5">
            <Label htmlFor="register-name">
              Name <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="register-name" name="name" type="text" autoComplete="name" placeholder="Your name" icon={<User />} autoFocus />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="register-email">Email</Label>
            <Input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail />} required />
          </div>

          <PasswordField
            id="register-password"
            name="password"
            label="Password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            icon={<Lock />}
            required
            meter
          />

          {state?.error && (
            <p ref={errRef} tabIndex={-1} className="text-sm text-destructive outline-none" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" variant="brand" size="lg" loading={pending} className="w-full">
            Create account
            {!pending && <ArrowRight />}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account you agree to our{" "}
            <Link href="/terms-of-use" className="text-foreground underline underline-offset-4 hover:text-muted-foreground">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="text-foreground underline underline-offset-4 hover:text-muted-foreground">Privacy Policy</Link>.
          </p>
        </form>
      </Card>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
