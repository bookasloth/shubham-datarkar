"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { normalizeDomain } from "./affiliate";

export type DomainState = { ok: boolean; message: string } | undefined;

export async function addAffiliateDomain(_prev: DomainState, formData: FormData): Promise<DomainState> {
  await requireAdmin();

  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  if (!domain) return { ok: false, message: "Enter a valid domain (e.g. amazon.in)." };

  const { error } = await supabaseAdmin().from("affiliate_domains").insert({ domain });
  if (error) {
    if (error.code === "23505") return { ok: false, message: `${domain} is already in the list.` };
    return { ok: false, message: "Could not add the domain. Has the table been created?" };
  }

  revalidatePath("/admin/affiliate");
  return { ok: true, message: `Added ${domain}.` };
}

export async function removeAffiliateDomain(domain: string): Promise<void> {
  await requireAdmin();
  await supabaseAdmin().from("affiliate_domains").delete().eq("domain", domain);
  revalidatePath("/admin/affiliate");
}
