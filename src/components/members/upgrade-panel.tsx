"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { openSubscriptionCheckout } from "@/lib/members/checkout";
import type { MembershipPlan } from "@/lib/members/membership-server";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const rupees = (paise: number) => Math.round(paise / 100);
const inr = (paise: number) => `₹${rupees(paise).toLocaleString("en-IN")}`;

export function UpgradePanel({
  plans,
  email,
  signedIn,
  initialPlanKey,
}: {
  plans: MembershipPlan[];
  email?: string;
  signedIn: boolean;
  initialPlanKey?: string;
}) {
  const router = useRouter();
  const monthly = plans.find((p) => p.interval === "monthly");
  const yearly = plans.find((p) => p.interval === "yearly");
  const defaultKey = yearly?.key ?? plans[0]?.key ?? "";

  // Returning from signup with a chosen plan (?plan=): reopen on that plan so
  // the now-signed-in member finishes checkout in one click.
  const resumeKey =
    initialPlanKey && plans.some((p) => p.key === initialPlanKey) ? initialPlanKey : undefined;

  const [open, setOpen] = useState(Boolean(resumeKey));
  const [selectedKey, setSelectedKey] = useState(resumeKey ?? defaultKey);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selected = plans.find((p) => p.key === selectedKey);

  // Yearly value, framed as free months — computed from live prices, never hardcoded.
  const monthsFree =
    monthly && yearly ? Math.round((monthly.amount * 12 - yearly.amount) / monthly.amount) : 0;

  async function checkout(plan: MembershipPlan) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/members/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: plan.key }),
      });
      const json = (await res.json()) as {
        subscriptionId?: string;
        keyId?: string;
        error?: string;
      };
      if (!res.ok || !json.subscriptionId || !json.keyId) {
        setMessage(json.error ?? "Could not start checkout.");
        return;
      }

      const outcome = await openSubscriptionCheckout({
        subscriptionId: json.subscriptionId,
        keyId: json.keyId,
        planName: plan.name,
        email,
      });

      if (outcome.status === "paid") {
        const confirm = await fetch("/api/members/subscribe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: outcome.paymentId,
            subscriptionId: outcome.subscriptionId,
            signature: outcome.signature,
            interval: plan.interval,
          }),
        });
        if (confirm.ok) {
          setMessage("Welcome, Member. Redirecting…");
          router.push("/members/account");
          router.refresh();
        } else {
          const j = (await confirm.json().catch(() => ({}))) as { error?: string };
          setMessage(j.error ?? "Payment received but confirmation failed — contact support.");
        }
      } else if (outcome.status === "failed") {
        setMessage("Payment failed. Nothing was charged beyond the failed attempt.");
      } else if (outcome.status === "error") {
        setMessage(outcome.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function onContinue() {
    if (!selected) return;
    if (!signedIn) {
      // Carry the chosen plan through signup; land back here to check out.
      const next = `/members/upgrade?plan=${selected.key}`;
      router.push(`/register?next=${encodeURIComponent(next)}`);
      return;
    }
    void checkout(selected);
  }

  if (!plans.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Membership is not open yet. Check back soon.
      </p>
    );
  }

  const options = [yearly, monthly].filter(Boolean) as MembershipPlan[];

  return (
    <div className="space-y-2">
      <Button size="lg" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Become a Member
      </Button>
      {yearly && monthsFree > 0 && (
        <p className="text-xs text-muted-foreground">
          From {inr(Math.round(yearly.amount / 12))}/mo billed yearly — {monthsFree} months free.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Become a Member</DialogTitle>
            <DialogDescription>
              {monthsFree > 0
                ? `Go yearly and get ${monthsFree} months free.`
                : "Pick the plan that suits you."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {options.map((plan) => {
              const isYear = plan.interval === "yearly";
              const on = selectedKey === plan.key;
              return (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => setSelectedKey(plan.key)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full items-center justify-between rounded-card border p-4 text-left transition-ui",
                    on ? "border-foreground bg-accent" : "border-border hover:bg-accent",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{isYear ? "Yearly" : "Monthly"}</span>
                      {isYear && monthsFree > 0 && (
                        <span className="rounded-btn bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">
                          {monthsFree} months free
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {isYear
                        ? `${inr(plan.amount)}/yr · ${inr(Math.round(plan.amount / 12))}/mo effective`
                        : `${inr(plan.amount)}/mo`}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      on ? "border-foreground bg-foreground text-background" : "border-border",
                    )}
                  >
                    {on && <Check className="size-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          <Button onClick={onContinue} loading={busy} disabled={!selected} className="w-full">
            {signedIn ? "Continue to checkout" : "Continue to create account"}
          </Button>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <p className="text-xs text-muted-foreground">
            Payments by Razorpay. Cancel anytime — access runs to the end of the paid period.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
