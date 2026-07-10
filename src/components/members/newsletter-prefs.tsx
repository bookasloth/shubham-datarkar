"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setMyNewsletter } from "@/lib/members/newsletter-actions";

export function NewsletterPrefs({ initialActive }: { initialActive: boolean }) {
  const { toast } = useToast();
  const [active, setActive] = React.useState(initialActive);
  const [loading, setLoading] = React.useState(false);

  async function toggle() {
    setLoading(true);
    const next = !active;
    const res = await setMyNewsletter(next);
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Couldn't update", description: "Please try again.", variant: "danger" });
      return;
    }
    setActive(next);
    toast({ title: next ? "Subscribed" : "Unsubscribed", variant: "success" });
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{active ? "You get the weekly newsletter." : "You're not subscribed."}</span>
      <Button type="button" variant="outline" size="sm" loading={loading} onClick={toggle}>
        {active ? "Unsubscribe" : "Subscribe"}
      </Button>
    </div>
  );
}
