"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { openSubscriptionCheckout } from "@/lib/members/checkout";
import type { MembershipPlan } from "@/lib/members/membership-server";
import { cn } from "@/lib/utils";

const PERKS = [
  "Every premium resource, unlocked",
  "All downloads and future updates",
  "Priority on member requests",
  "New drops every week",
];

function priceLabel(p: MembershipPlan): string {
  const rupees = Math.round(p.amount / 100);
  return `₹${rupees.toLocaleString("en-IN")} / ${p.interval === "monthly" ? "month" : "year"}`;
}

export function UpgradePanel({
  plans,
  email,
  signedIn,
}: {
  plans: MembershipPlan[];
  email?: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function subscribe(plan: MembershipPlan) {
    if (!signedIn) {
      router.push(`/members/login?next=${encodeURIComponent("/members/upgrade")}`);
      return;
    }
    setBusy(plan.key);
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
          setMessage("Welcome to premium. Redirecting…");
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
      setBusy(null);
    }
  }

  if (!plans.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Premium plans are not open yet. Check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <div
            key={p.key}
            className={cn(
              "flex flex-col rounded-card border bg-card p-6 shadow-xs",
              p.interval === "yearly" ? "border-foreground" : "border-border",
            )}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">{p.name}</h2>
              {p.interval === "yearly" && (
                <span className="rounded-btn bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">
                  Best value
                </span>
              )}
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{priceLabel(p)}</div>
            {p.description && (
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
            )}
            <ul className="mt-4 space-y-2 text-sm">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {perk}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => subscribe(p)}
              disabled={busy !== null}
              className="mt-6 rounded-btn bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-ui hover:opacity-85 disabled:opacity-50"
            >
              {busy === p.key ? "Opening checkout…" : `Go premium ${p.interval}`}
            </button>
          </div>
        ))}
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <p className="text-xs text-muted-foreground">
        Payments are processed by Razorpay. Cancel anytime — access runs to the end of the paid
        period.
      </p>
    </div>
  );
}
