"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { ItemPicker } from "./item-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { ITEMS, FEE_PCT, formatMoney } from "@/lib/support/config";
import { computeAmount } from "@/lib/support/amount";
import { openZohoCheckout } from "@/lib/support/checkout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MSG_MAX = 250;
const coffee = ITEMS.find((i) => i.key === "coffee")!;
const toffee = ITEMS.find((i) => i.key === "toffee")!;

/**
 * Stateful Support panel: two pickers + form + commit button. Holds the shared
 * quantity state so the button total updates live and instantly (no network).
 */
export function SupportPanel() {
  const { toast } = useToast();
  const [coffeeQty, setCoffeeQty] = React.useState(coffee.defaultQty);
  const [toffeeQty, setToffeeQty] = React.useState(toffee.defaultQty);
  const [coversFee, setCoversFee] = React.useState(true);
  const [anonymous, setAnonymous] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [emailErr, setEmailErr] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);

  const amount = computeAmount(coffeeQty, toffeeQty, coversFee);
  const disabled = amount.base <= 0;

  async function onSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setEmailErr("Enter a valid email so we can send your receipt.");
      return;
    }
    setEmailErr(undefined);
    setLoading(true);

    try {
      const res = await fetch("/api/support/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coffeeUnits: coffeeQty,
          toffeeUnits: toffeeQty,
          coversFee,
          anonymous,
          email,
          name: name || undefined,
          message: message || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "Couldn't start payment",
          description: data?.error ?? "Please try again.",
          variant: "danger",
        });
        return;
      }

      const outcome = await openZohoCheckout({
        paymentsSessionId: data.paymentsSessionId,
        accountId: data.accountId,
        apiKey: data.apiKey,
        amount: data.amount,
        currency: data.currency,
        symbol: data.symbol,
        email,
        name: name || undefined,
      });

      if (outcome.status === "paid") {
        toast({
          title: "Thank you!",
          description: `Your ${formatMoney(amount.base)} support means a lot.`,
          variant: "success",
        });
        setCoffeeQty(coffee.defaultQty);
        setToffeeQty(toffee.defaultQty);
        setMessage("");
      } else if (outcome.status === "cancelled") {
        toast({
          title: "Payment cancelled",
          description: "No charge was made — your details are still here.",
        });
      } else {
        toast({
          title: "Payment failed",
          description: outcome.message,
          variant: "danger",
        });
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSupport} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ItemPicker item={coffee} qty={coffeeQty} onQty={setCoffeeQty} />
        <ItemPicker item={toffee} qty={toffeeQty} onQty={setToffeeQty} />
      </div>

      <div className="grid gap-4 rounded-card border border-border bg-card p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="sup-name">
              Name <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="sup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should I thank you?"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sup-email">Email</Label>
            <Input
              id="sup-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailErr(undefined);
              }}
              aria-invalid={!!emailErr}
              placeholder="you@email.com"
            />
            {emailErr && (
              <p className="text-xs text-danger" role="alert">
                {emailErr}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="sup-msg">
            Message <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="sup-msg"
            value={message}
            maxLength={MSG_MAX}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say hi, leave a note, or tell me what to build next."
            className="min-h-24"
          />
          <p className="text-right text-xs tabular-nums text-muted-foreground">
            {message.length}/{MSG_MAX}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={coversFee} onCheckedChange={(v) => setCoversFee(v === true)} className="mt-0.5" />
            <span>Cover the {Math.round(FEE_PCT * 100)}% fee so I get the full amount.</span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} className="mt-0.5" />
            <span>Show me as anonymous.</span>
          </label>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Button type="submit" size="lg" loading={loading} disabled={disabled} className="w-full">
          {!loading && <Heart />}
          {disabled ? "Pick a coffee or toffee" : `Support with ${formatMoney(amount.base)}`}
        </Button>
        {coversFee && amount.fee > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Includes {formatMoney(amount.fee)} to cover gateway fees.
          </p>
        )}
      </div>
    </form>
  );
}
