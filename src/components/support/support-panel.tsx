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
    // TODO(payments): POST /api/support/session then open the Zoho checkout
    // widget with the returned payment_session_id. Mocked for now.
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    toast({
      title: "Thank you!",
      description: `Your ${formatMoney(amount.base)} support means a lot.`,
      variant: "success",
    });
    setCoffeeQty(coffee.defaultQty);
    setToffeeQty(toffee.defaultQty);
    setMessage("");
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

        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={coversFee} onCheckedChange={(v) => setCoversFee(v === true)} className="mt-0.5" />
          <span>
            Cover the gateway fees (+{Math.round(FEE_PCT * 100)}%) so the full amount reaches me.{" "}
            {coversFee && amount.fee > 0 && (
              <span className="text-muted-foreground">Adds {formatMoney(amount.fee)} at checkout.</span>
            )}
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} className="mt-0.5" />
          <span>Show me as anonymous on the supporters wall.</span>
        </label>
      </div>

      <Button type="submit" size="lg" loading={loading} disabled={disabled} className="w-full">
        {!loading && <Heart />}
        {disabled ? "Pick a coffee or toffee" : `Support with ${formatMoney(amount.base)}`}
      </Button>
    </form>
  );
}
