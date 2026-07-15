import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { communityWelcome, postPublished, newComment } from "@/lib/email/templates/community";

const SITE = "https://shubhamdatarkar.com";

/** First root post welcomes; subsequent posts get a publish notice. */
export function postEmailKind(priorPostCount: number): "welcome" | "published" {
  return priorPostCount === 0 ? "welcome" : "published";
}

/** Fire after a successful root-post insert. Best-effort. */
export async function notifyPostCreated(userId: string, postHref: string): Promise<void> {
  try {
    const admin = supabaseAdmin();
    // count includes the just-inserted post → 1 means first.
    const { count } = await admin
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("parent_id", null)
      .is("reblog_of", null);
    const email = await getUserEmail(userId);
    if (!email) return;
    const kind = postEmailKind((count ?? 1) - 1);
    if (kind === "welcome") await sendTemplate(email, communityWelcome({}));
    else await sendTemplate(email, postPublished({ href: postHref }));
  } catch (e) {
    console.warn("[community] post email failed:", (e as Error).message);
  }
}

/** Fire after a successful reply insert. Emails the parent author (not self). */
export async function notifyReply(parentPostId: string, replierUserId: string): Promise<void> {
  try {
    const admin = supabaseAdmin();
    const { data: parent } = await admin
      .from("community_posts")
      .select("user_id, public_id")
      .eq("id", parentPostId)
      .maybeSingle();
    if (!parent?.user_id || parent.user_id === replierUserId) return;

    const email = await getUserEmail(parent.user_id);
    if (!email) return;

    const { data: replier } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", replierUserId)
      .maybeSingle();
    const author = replier?.display_name || (replier?.username ? `@${replier.username}` : "Someone");
    const href = `${SITE}/community/p/${parent.public_id}`;
    await sendTemplate(email, newComment({ author, excerpt: "", href }));
  } catch (e) {
    console.warn("[community] reply email failed:", (e as Error).message);
  }
}
