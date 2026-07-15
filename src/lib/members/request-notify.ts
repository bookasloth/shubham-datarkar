import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { requestReceived, requestApproved, requestDeclined } from "@/lib/email/templates/requests";

/** Which status change warrants which email (open → none). */
export function statusToTemplateKind(status: string): "approved" | "declined" | null {
  if (status === "shipped" || status === "planned") return "approved";
  if (status === "declined") return "declined";
  return null;
}

export async function notifyRequestReceived(userEmail: string, kind: string, title: string): Promise<void> {
  try {
    await sendTemplate(userEmail, requestReceived({ kind, title }));
  } catch (e) {
    console.warn("[requests] received email failed:", (e as Error).message);
  }
}

export async function notifyRequestStatus(requestId: string, status: string): Promise<void> {
  const kind = statusToTemplateKind(status);
  if (!kind) return;
  try {
    const { data: r } = await supabaseAdmin()
      .from("member_requests")
      .select("user_id, title")
      .eq("id", requestId)
      .maybeSingle();
    if (!r?.user_id) return;
    const email = await getUserEmail(r.user_id);
    if (!email) return;
    if (kind === "approved") await sendTemplate(email, requestApproved({ title: r.title }));
    else await sendTemplate(email, requestDeclined({ title: r.title }));
  } catch (e) {
    console.warn("[requests] status email failed:", (e as Error).message);
  }
}
