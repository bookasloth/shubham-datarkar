"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type Plan = {
  name: string;
  monthly: number;
  annual: number;
  blurb: string;
  features: string[];
  featured?: boolean;
  cta?: string;
};

export function PricingTable({
  plans,
  currency = "₹",
  className,
}: {
  plans: Plan[];
  currency?: string;
  className?: string;
}) {
  const [billing, setBilling] = React.useState<"monthly" | "annual">("monthly");

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <ToggleGroup
        type="single"
        value={billing}
        onValueChange={(v) => v && setBilling(v as "monthly" | "annual")}
        aria-label="Billing period"
      >
        <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
        <ToggleGroupItem value="annual">Annual · save 20%</ToggleGroupItem>
      </ToggleGroup>

      <div className="mt-8 grid w-full gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const price = billing === "monthly" ? plan.monthly : plan.annual;
          return (
            <Card
              key={plan.name}
              className={cn("flex flex-col p-6", plan.featured && "border-foreground ring-1 ring-foreground")}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                {plan.featured && <Badge>Popular</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold tracking-tight">
                  {currency}
                  {price.toLocaleString("en-IN")}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              {billing === "annual" && <p className="mt-1 text-xs text-muted-foreground">billed annually</p>}
              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant={plan.featured ? "default" : "outline"} className="mt-6 w-full">
                {plan.cta ?? "Choose plan"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
