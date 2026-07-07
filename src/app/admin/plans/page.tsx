import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { savePlan } from "@/lib/members/admin-actions";
import { PageHeader } from "@/components/admin";
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

export default async function PlansAdminPage() {
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("membership_plans")
    .select("id,key,name,description,amount,interval,razorpay_plan_id,active,sort")
    .order("sort");
  const plans = (data ?? []) as PlanRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership plans"
        description="Create matching plans in the Razorpay dashboard, paste their plan ids here, then activate. Amounts are in paise."
      />

      <div className="space-y-3">
        {plans.map((p) => (
          <form
            key={p.id}
            action={savePlan}
            className="grid gap-2 rounded-card border border-border bg-card p-4 sm:grid-cols-[8rem_10rem_7rem_6rem_1fr_auto_auto]"
          >
            <input type="hidden" name="key" value={p.key} />
            <div className="self-center font-mono text-xs text-muted-foreground">{p.key}</div>
            <input name="name" defaultValue={p.name} className={CELL} />
            <input name="amount" type="number" defaultValue={p.amount} className={CELL} title="Paise" />
            <select name="interval" defaultValue={p.interval} className={CELL}>
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
            </select>
            <input
              name="razorpay_plan_id"
              defaultValue={p.razorpay_plan_id ?? ""}
              placeholder="plan_XXXXXXXX (from Razorpay)"
              className={`${CELL} font-mono`}
            />
            <label className="flex items-center gap-1.5 self-center text-xs">
              <input type="checkbox" name="active" defaultChecked={p.active} /> Active
            </label>
            <Button type="submit" variant="outline" size="sm">Save</Button>
            <input type="hidden" name="sort" value={p.sort} />
            <input type="hidden" name="description" value={p.description ?? ""} />
          </form>
        ))}

        <form
          action={savePlan}
          className="grid gap-2 rounded-card border border-dashed border-border p-4 sm:grid-cols-[8rem_10rem_7rem_6rem_1fr_auto_auto]"
        >
          <Input name="key" placeholder="plan-key" className="h-8" required />
          <Input name="name" placeholder="Name" className="h-8" required />
          <input name="amount" type="number" placeholder="Paise" className={CELL} required />
          <select name="interval" defaultValue="monthly" className={CELL}>
            <option value="monthly">monthly</option>
            <option value="yearly">yearly</option>
          </select>
          <input name="razorpay_plan_id" placeholder="plan_XXXXXXXX" className={`${CELL} font-mono`} />
          <label className="flex items-center gap-1.5 self-center text-xs">
            <input type="checkbox" name="active" /> Active
          </label>
          <Button type="submit" size="sm">Add</Button>
          <input type="hidden" name="sort" value={plans.length + 1} />
        </form>
      </div>
    </div>
  );
}
