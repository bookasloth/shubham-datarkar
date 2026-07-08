"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { GRANTABLE_CAPABILITIES } from "./capabilities";

/**
 * Reconcile one plan's capability grants from the checkbox form:
 * every checked `cap_<key>` becomes a row, the rest are removed.
 */
export async function savePlanCapabilities(formData: FormData): Promise<void> {
  await requireAdmin();
  const planKey = String(formData.get("plan_key") ?? "").trim();
  if (!planKey) throw new Error("Missing plan.");

  const checked = GRANTABLE_CAPABILITIES.filter(
    (cap) => formData.get(`cap_${cap}`) === "on",
  );

  const supabase = await supabaseAuthServer();
  const { error: delError } = await supabase
    .from("plan_capabilities")
    .delete()
    .eq("plan_key", planKey);
  if (delError) throw new Error(delError.message);

  if (checked.length) {
    const rows = checked.map((capability) => ({ plan_key: planKey, capability }));
    const { error } = await supabase.from("plan_capabilities").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/plans");
}
