import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { createRazorpayPlan, savePlan } from "@/lib/members/admin-actions";
import { savePlanCapabilities } from "@/lib/members/capability-admin-actions";
import { GRANTABLE_CAPABILITIES, capabilityLabel } from "@/lib/members/capabilities";
import { PageHeader, StatusBadge } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

type PlanRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  amount: number;
  interval: string;
  razorpay_plan_id: string | null;
  active: boolean;
  sort: number;
};

const CELL = "h-8 rounded-btn border border-border bg-background px-2 text-sm";
const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export default async function PlansAdminPage() {
  const supabase = await supabaseAuthServer();
  const [{ data }, { data: capRows }] = await Promise.all([
    supabase
      .from("membership_plans")
      .select("id,key,name,description,amount,interval,razorpay_plan_id,active,sort")
      .order("sort"),
    supabase.from("plan_capabilities").select("plan_key,capability"),
  ]);
  const plans = (data ?? []) as PlanRow[];

  const capsByPlan = new Map<string, Set<string>>();
  for (const r of capRows ?? []) {
    const set = capsByPlan.get(r.plan_key) ?? new Set<string>();
    set.add(r.capability);
    capsByPlan.set(r.plan_key, set);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership plans"
        description="Set the price, then click Create in Razorpay — it creates the plan on Razorpay (same account as your other payments) and activates it. No Razorpay dashboard needed. Amounts are in paise (₹99 = 9900)."
      />

      <div className="space-y-3">
        {plans.map((p) => {
          const granted = capsByPlan.get(p.key) ?? new Set<string>();
          const isFree = p.interval === "free" || p.amount === 0;
          return (
            <div key={p.id} className="space-y-2 rounded-card border border-border bg-card p-4">
              {isFree ? (
                <div className="flex items-center gap-2">
                  <span className="w-28 font-mono text-xs text-muted-foreground">{p.key}</span>
                  <span className="text-sm font-medium">{p.name}</span>
                  <StatusBadge tone="neutral">baseline</StatusBadge>
                </div>
              ) : (
                <form action={savePlan} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="key" value={p.key} />
                  <input type="hidden" name="sort" value={p.sort} />
                  <input type="hidden" name="description" value={p.description ?? ""} />

                  <span className="w-28 font-mono text-xs text-muted-foreground">{p.key}</span>
                  <input name="name" defaultValue={p.name} className={`${CELL} w-40`} />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input name="amount" type="number" defaultValue={p.amount} className={`${CELL} w-24`} title="Paise" />
                    paise ({rupees(p.amount)})
                  </label>
                  <select name="interval" defaultValue={p.interval} className={`${CELL} w-24`}>
                    <option value="monthly">monthly</option>
                    <option value="yearly">yearly</option>
                  </select>
                  <input
                    name="razorpay_plan_id"
                    defaultValue={p.razorpay_plan_id ?? ""}
                    placeholder="plan_… (auto-filled)"
                    className={`${CELL} w-52 font-mono`}
                  />
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" name="active" defaultChecked={p.active} /> Active
                  </label>
                  <div className="ml-auto flex items-center gap-2">
                    {p.razorpay_plan_id ? (
                      <StatusBadge tone={p.active ? "success" : "neutral"}>
                        {p.active ? "live" : "linked"}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="warning">not on Razorpay</StatusBadge>
                    )}
                    <Button type="submit" variant="outline" size="sm">Save</Button>
                    <Button type="submit" formAction={createRazorpayPlan} size="sm">
                      {p.razorpay_plan_id ? "Re-activate" : "Create in Razorpay"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Capability grants for this plan */}
              <form action={savePlanCapabilities} className="border-t border-border pt-3">
                <input type="hidden" name="plan_key" value={p.key} />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Capabilities</span>
                  <Button type="submit" variant="outline" size="sm">Save capabilities</Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                  {GRANTABLE_CAPABILITIES.map((cap) => (
                    <label key={cap} className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" name={`cap_${cap}`} defaultChecked={granted.has(cap)} />
                      {capabilityLabel(cap)}
                    </label>
                  ))}
                </div>
              </form>
            </div>
          );
        })}

        {/* Add a brand-new plan (rare — the two premium plans are seeded). */}
        <form
          action={savePlan}
          className="flex flex-wrap items-center gap-2 rounded-card border border-dashed border-border p-4"
        >
          <Input name="key" placeholder="plan-key" className="h-8 w-28" required />
          <Input name="name" placeholder="Name" className="h-8 w-40" required />
          <input name="amount" type="number" placeholder="Paise" className={`${CELL} w-24`} required />
          <select name="interval" defaultValue="monthly" className={`${CELL} w-24`}>
            <option value="monthly">monthly</option>
            <option value="yearly">yearly</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" name="active" /> Active
          </label>
          <input type="hidden" name="sort" value={plans.length + 1} />
          <Button type="submit" size="sm" className="ml-auto">
            Add draft
          </Button>
        </form>
      </div>
    </div>
  );
}
