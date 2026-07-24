import { renderEmail, emailGif, emailPostList } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Welcome to the community. Humour: High. */
export function communityWelcome(a: { name?: string | null; username?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  const handle = a.username ? `@${esc(a.username)}` : "one of us";
  return {
    subject: "Welcome. You can lurk first.",
    html: renderEmail({
      preheader: "Your seat is ready. Participation remains suspiciously optional.",
      headerTagline: "Community",
      title: "Welcome. You can lurk first.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Welcome to the community.") +
        p(`Around here, you're <strong>${handle}</strong>.`) +
        p("People share what they're building, what worked, what absolutely did not work, and the occasional thing they probably should've Googled first.") +
        p("You don't need an introduction post.") +
        p("You don't need a clever first comment.") +
        p("Lurk for three weeks if you want.") +
        p("But when you have something to say, say it."),
      cta: { label: "Enter the community", href: `${SITE}/community` },
      afterCta: emailGif(EMAIL_GIFS.communityWelcome, "A crowd waving hello"),
    }),
    text: `Hey ${first}, welcome to the community. You're ${a.username ? `@${a.username}` : "one of us"} now. No intro post, no clever first comment — lurk if you like, then say something when you're ready. Enter: ${SITE}/community`,
  };
}

/** Nudge: joined but hasn't posted yet. Humour: Subtle. */
export function firstPostNudge(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "You've been suspiciously quiet",
    html: renderEmail({
      preheader: "Your first post does not need to change the internet.",
      headerTagline: "Community",
      title: "You've been suspiciously quiet",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("You've been reading.") +
        p("Which is perfectly legal.") +
        p("But at some point, you should probably say something too.") +
        p("Tell us what you're building. Ask a question. Share something that worked. Complain about something that didn't.") +
        p("It doesn't need to be profound.") +
        p("This is the internet. The bar has survived worse."),
      cta: { label: "Write something", href: `${SITE}/community` },
      afterCta: emailGif(EMAIL_GIFS.firstPost, "A blank page and a blinking cursor"),
    }),
    text: `Hey ${first}, you've been reading — which is legal — but say something too. What you're building, a question, a win, a complaint. Doesn't need to be profound. Write something: ${SITE}/community`,
  };
}

/** Your post is live. Humour: Subtle. */
export function postPublished(a: { name?: string | null; href: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Look at you. Publishing things.",
    html: renderEmail({
      preheader: "Your post is live and other humans can now have opinions about it.",
      headerTagline: "Community",
      title: "Look at you. Publishing things.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Your post is live.") +
        p("It has officially left the safety of your draft box and entered the internet.") +
        p("People can now read it, react to it, reply to it, or silently agree without clicking anything.") +
        p("Go have a look."),
      cta: { label: "View my post", href: a.href },
      afterCta: emailGif(EMAIL_GIFS.postPublished, "A small burst of confetti"),
    }),
    text: `Hey ${first}, your post is live — out of the draft box and into the internet. Go have a look: ${a.href}`,
  };
}

/** Someone commented on your post. Humour: Subtle. */
export function newComment(a: { name?: string | null; author: string; excerpt: string; href: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `${a.author} had something to say`,
    html: renderEmail({
      preheader: "Someone replied to your post. The internet is working.",
      headerTagline: "Community",
      title: `${esc(a.author)} had something to say`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p(`<strong>${esc(a.author)}</strong> replied to your post.`) +
        `<p style="margin:0 0 18px; padding:12px 16px; background:#f6f8fa; border-radius:10px; font-size:14px; color:#2d2d2d; line-height:1.6;">"${esc(a.excerpt)}"</p>` +
        p("That's all I'm showing you here.") +
        p("You'll have to click if you want the rest.") +
        p("Yes, I understand what I'm doing."),
      cta: { label: "Read the full reply", href: a.href },
      afterCta: emailGif(EMAIL_GIFS.newComment, "A speech bubble popping up", 340),
    }),
    text: `Hey ${first}, ${a.author} replied to your post:\n\n"${a.excerpt}"\n\nRead the full reply: ${a.href}`,
  };
}

/** Someone @mentioned you in a post or reply. Humour: Subtle.
 *  ponytail: reuses the newComment GIF — same "someone is talking to you" beat,
 *  and it saves adding a 32nd asset to the upload list. Give it its own key if the
 *  two ever want different art. */
export function mentioned(a: { name?: string | null; author: string; excerpt: string; href: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `${a.author} mentioned you`,
    html: renderEmail({
      preheader: "Your name came up. In a good way, probably.",
      headerTagline: "Community",
      title: `${esc(a.author)} mentioned you`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p(`<strong>${esc(a.author)}</strong> tagged you in the community.`) +
        `<p style="margin:0 0 18px; padding:12px 16px; background:#f6f8fa; border-radius:10px; font-size:14px; color:#2d2d2d; line-height:1.6;">"${esc(a.excerpt)}"</p>` +
        p("Someone wanted you specifically in this one.") +
        p("Which is either flattering or a trap.") +
        p("Only one way to find out."),
      cta: { label: "See the mention", href: a.href },
      afterCta: emailGif(EMAIL_GIFS.newComment, "A speech bubble popping up", 340),
    }),
    text: `Hey ${first}, ${a.author} mentioned you in the community:\n\n"${a.excerpt}"\n\nSee it: ${a.href}`,
  };
}

/** Weekly community digest. Humour: Subtle. */
export function communityDigest(a: { items: { title: string; href: string; meta?: string }[] }): RenderedEmail {
  return {
    subject: "The community was busy while you were doing actual work",
    html: renderEmail({
      preheader: "Here's what people couldn't stop talking about this week.",
      headerTagline: "Weekly community digest",
      title: "The community was busy",
      bodyHtml:
        p("Hey there,") +
        p("A lot happened in the community this week.") +
        p("Thankfully, you do not need to scroll through all of it.") +
        p("These are the posts that got people talking:") +
        emailPostList(a.items) +
        p("Consider this your shortcut."),
      cta: { label: "See what happened", href: `${SITE}/community` },
      afterCta: emailGif(EMAIL_GIFS.communityDigest, "A lively buzzing feed", 380),
    }),
    text:
      `This week in the community:\n\n` +
      a.items.map((x) => `• ${x.title} — ${x.href}`).join("\n") +
      `\n\n${SITE}/community`,
  };
}

/** Someone followed you. Humour: Medium. */
export function followed(a: { name?: string | null; author: string; href: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `${a.author} followed you`,
    html: renderEmail({
      preheader: "One more person will now see what you post.",
      headerTagline: "Community",
      title: `${esc(a.author)} followed you`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p(`<strong>${esc(a.author)}</strong> just followed you in the community.`) +
        p("Which means your posts now turn up in their feed, unprompted.") +
        p("No pressure. That's a lie, obviously — there's some pressure."),
      cta: { label: "See their profile", href: a.href },
      afterCta: emailGif(EMAIL_GIFS.newComment, "A notification bell ringing", 340),
    }),
    text: `Hey ${first}, ${a.author} followed you in the community. Your posts now show up in their feed. See their profile: ${a.href}`,
  };
}
