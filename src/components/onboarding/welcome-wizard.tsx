"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UpgradePanel } from "@/components/members/upgrade-panel";
import type { MembershipPlan } from "@/lib/members/membership-server";
import {
  saveOnboardingStep1,
  completeOnboarding,
  type Step1State,
} from "@/lib/auth/onboarding-actions";
import { validateUsername } from "@/lib/auth/username";

const REFERRALS = ["Search", "X / Twitter", "LinkedIn", "Instagram", "YouTube", "A friend", "Other"];

export function WelcomeWizard({
  initialUsername,
  plans,
  email,
  isPremium,
  next,
}: {
  initialUsername: string;
  plans: MembershipPlan[];
  email?: string;
  isPremium: boolean;
  next: string | null;
}) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const finish = completeOnboarding.bind(null, next);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 flex items-center justify-center gap-2">
        <Dot on={step >= 1} />
        <Dot on={step >= 2} />
      </div>

      {step === 1 ? (
        <StepOne initialUsername={initialUsername} onDone={() => setStep(2)} />
      ) : (
        <div className="grid gap-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Unlock everything</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Become a Member for the full archive, tools, and downloads. Or skip — you can upgrade anytime.
            </p>
          </div>
          <Card className="p-6">
            {isPremium ? (
              <p className="text-center text-sm text-muted-foreground">You&apos;re already a Member.</p>
            ) : (
              <UpgradePanel plans={plans} email={email} signedIn />
            )}
          </Card>
          <form action={finish}>
            <button type="submit" className="w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {isPremium ? "Continue" : "Skip for now"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function StepOne({ initialUsername, onDone }: { initialUsername: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<Step1State, FormData>(saveOnboardingStep1, undefined);
  const [username, setUsername] = React.useState(initialUsername);
  const localError = username.length > 0 ? validateUsername(username) : null;

  React.useEffect(() => {
    if (state && "ok" in state) onDone();
  }, [state, onDone]);

  return (
    <div className="grid gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome aboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a username and tell us how you found us.</p>
      </div>
      <Card className="p-6">
        <form action={action} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="wizard-username">Username</Label>
            <Input
              id="wizard-username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="yourhandle"
              required
              autoFocus
            />
            {localError && <p className="text-xs text-destructive">{localError}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="wizard-referral">Where did you hear about us?</Label>
            <select
              id="wizard-referral"
              name="referral"
              className="rounded-btn border border-border bg-background px-3 py-2 text-sm outline-none transition-ui focus:border-brand"
              defaultValue=""
            >
              <option value="" disabled>Choose one…</option>
              {REFERRALS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {state && "error" in state && (
            <p className="text-sm text-destructive" role="alert">{state.error}</p>
          )}

          <Button type="submit" size="lg" loading={pending} disabled={!!localError} className="w-full">
            Continue
            {!pending && <ArrowRight />}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return <span className={`h-1.5 w-6 rounded-full ${on ? "bg-foreground" : "bg-border"}`} />;
}
