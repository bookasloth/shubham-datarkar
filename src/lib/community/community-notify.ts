import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { communityWelcome, postPublished, newComment, mentioned, followed } from "@/lib/email/templates/community";
import { mentionedHandles } from "@/lib/community/linkify";
import { claim, istParts } from "@/lib/email/dispatch/dedupe";

const SITE = "https://shubhamdatarkar.com";

// One post can't email more than this many people, however many handles it packs.
// Without it, a single body is an email-fanout amplifier pointed at the same SMTP
// box that carries password resets.
const MAX_MENTION_EMAILS = 10;

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
    if (kind === "welcome") {
      await sendTemplate(email, communityWelcome({}));
      return;
    }
    // Publish notice: at most once a day, only for the first post of that day.
    // The daily claim both dedupes and enforces "first post today wins".
    const day = istParts(new Date()).date;
    if (!(await claim(email, "postPublished", day))) return;
    await sendTemplate(email, postPublished({ href: postHref }));
  } catch (e) {
    console.warn("[community] post email failed:", (e as Error).message);
  }
}

/** Fire after a post/reply insert that may contain @handles. Emails each mentioned
 *  member. Best-effort: a bad handle, a missing email, or a dead SMTP box must
 *  never fail the post that's already committed.
 *
 *  `excludeUserIds` keeps someone who's already getting a notify for this same
 *  insert (the parent author of a reply) from receiving two emails about it. */
export async function notifyMentions(
  body: string,
  actorId: string,
  href: string,
  excludeUserIds: string[] = [],
): Promise<void> {
  try {
    const handles = mentionedHandles(body);
    if (handles.length === 0) return;

    const admin = supabaseAdmin();
    const { data: targets } = await admin
      .from("profiles")
      .select("id, username")
      .in("username", handles.slice(0, MAX_MENTION_EMAILS));
    if (!targets?.length) return;

    const skip = new Set([actorId, ...excludeUserIds]);
    const { data: actor } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", actorId)
      .maybeSingle();
    const author = actor?.display_name || (actor?.username ? `@${actor.username}` : "Someone");
    const trimmed = body.trim();
    const excerpt = trimmed.slice(0, 140) + (trimmed.length > 140 ? "…" : "");

    for (const t of targets) {
      const targetId = t.id as string;
      if (skip.has(targetId)) continue;
      const email = await getUserEmail(targetId);
      if (!email) continue;
      await sendTemplate(email, mentioned({ author, excerpt, href }));
    }
  } catch (e) {
    console.warn("[community] mention email failed:", (e as Error).message);
  }
}

/** Fire after a successful reply insert. Emails the parent author (not self). */
export async function notifyReply(parentPostId: string, replierUserId: string, replyBody: string): Promise<void> {
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
    const trimmedBody = replyBody.trim();
    const excerpt = trimmedBody.slice(0, 140) + (trimmedBody.length > 140 ? "…" : "");
    await sendTemplate(email, newComment({ author, excerpt, href }));
  } catch (e) {
    console.warn("[community] reply email failed:", (e as Error).message);
  }
}

/** Fire after a follow row is inserted. Emails the followee (never on unfollow,
 *  and never for a re-follow of someone you already followed — toggleFollow only
 *  calls this on the insert path). Best-effort. */
export async function notifyFollow(followeeId: string, followerId: string): Promise<void> {
  try {
    if (followeeId === followerId) return;
    const admin = supabaseAdmin();
    const email = await getUserEmail(followeeId);
    if (!email) return;

    const { data: follower } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", followerId)
      .maybeSingle();
    if (!follower?.username) return;
    const author = follower.display_name || `@${follower.username}`;
    await sendTemplate(email, followed({ author, href: `${SITE}/community/u/${follower.username}` }));
  } catch (e) {
    console.warn("[community] follow email failed:", (e as Error).message);
  }
}

