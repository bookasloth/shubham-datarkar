import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { claim } from "@/lib/email/dispatch/dedupe";
import { newMemberResource } from "@/lib/email/templates/membership";

const SITE = "https://shubhamdatarkar.com";

/**
 * Announce a newly published members-only resource to active members.
 * Best-effort: a mail failure must never break the publish. Deduped per resource
 * slug so re-saving a published resource can't re-blast the list.
 */
export async function notifyNewResource(a: { slug: string; title: string; type: string }): Promise<void> {
  try {
    const admin = supabaseAdmin();
    const href = `${SITE}/members/resources/${a.slug}`;
    const { data: memberships } = await admin
      .from("memberships")
      .select("user_id")
      .eq("status", "active");
    const emails = new Set<string>();
    for (const m of memberships ?? []) {
      const addr = await getUserEmail(m.user_id);
      if (addr) emails.add(addr);
    }
    for (const to of emails) {
      if (!(await claim(to, "newMemberResource", a.slug))) continue;
      await sendTemplate(to, newMemberResource({ title: a.title, href, kind: a.type }));
    }
  } catch (e) {
    console.warn("[members] notifyNewResource failed:", (e as Error).message);
  }
}
