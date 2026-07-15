import { renderEmail, emailGif, emailPostList } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Welcome to the community. Humour: High. */
export function communityWelcome(a: { name?: string | null; username?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  const handle = a.username ? ` You're <strong>@${esc(a.username)}</strong> around here.` : "";
  return {
    subject: "Welcome to the community.",
    html: renderEmail({
      preheader: "You've got a seat. Pull it up.",
      headerTagline: "Community",
      title: `Welcome in, ${esc(first)}.`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.communityWelcome, "A crowd waving hello") +
        p(`You're officially part of the community.${handle}`) +
        p("It's a feed of builders sharing what they're working on, what broke, and what actually worked. Lurk for a bit if you like — then say something when you're ready."),
      cta: { label: "Jump into the feed", href: `${SITE}/community` },
    }),
    text: `Welcome in, ${first}. You're part of the community now. Jump into the feed: ${SITE}/community`,
  };
}

/** Nudge: joined but hasn't posted yet. Humour: Subtle. */
export function firstPostNudge(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "The feed's waiting for you",
    html: renderEmail({
      preheader: "Your first post is the hardest. It's also two minutes of work.",
      headerTagline: "Community",
      title: "Say your first thing.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.firstPost, "A blank page and a blinking cursor") +
        p(`Hey ${esc(first)}, you've been reading — which is great — but the feed is better with you in it.`) +
        p("It doesn't have to be profound. What you're building, what you're stuck on, a small win from today. That's a post."),
      cta: { label: "Write your first post", href: `${SITE}/community` },
    }),
    text: `Hey ${first}, the feed's better with you in it. Write your first post — what you're building, or what's stuck: ${SITE}/community`,
  };
}

/** Your post is live. Humour: Subtle. */
export function postPublished(a: { name?: string | null; href: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Your post is live.",
    html: renderEmail({
      preheader: "Out in the wild. Go see how it looks.",
      headerTagline: "Community",
      title: "It's live.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.postPublished, "A small burst of confetti") +
        p(`Nicely done, ${esc(first)}. Your post is out in the feed for everyone to see.`) +
        p("Keep an eye on it — replies and reactions have a way of showing up when you least expect them."),
      cta: { label: "View your post", href: a.href },
    }),
    text: `Your post is live, ${first}. View it: ${a.href}`,
  };
}

/** Someone commented on your post. Humour: Subtle. */
export function newComment(a: { name?: string | null; author: string; excerpt: string; href: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `${a.author} replied to you`,
    html: renderEmail({
      preheader: `${a.author} left a comment on your post.`,
      headerTagline: "Community",
      title: "You've got a reply.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.newComment, "A speech bubble popping up", 340) +
        p(`Hi ${esc(first)}, <strong>${esc(a.author)}</strong> just responded to your post:`) +
        `<p style="margin:0 0 18px; padding:12px 16px; background:#f6f8fa; border-radius:10px; font-size:14px; color:#2d2d2d; line-height:1.6;">${esc(a.excerpt)}</p>`,
      cta: { label: "Read the reply", href: a.href },
    }),
    text: `${a.author} replied to your post:\n\n"${a.excerpt}"\n\nRead it: ${a.href}`,
  };
}

/** Weekly community digest. Humour: Subtle. */
export function communityDigest(a: { items: { title: string; href: string; meta?: string }[] }): RenderedEmail {
  return {
    subject: "This week in the community",
    html: renderEmail({
      preheader: "The posts people actually reacted to this week.",
      headerTagline: "Weekly community digest",
      title: "What happened this week",
      bodyHtml:
        emailGif(EMAIL_GIFS.communityDigest, "A lively buzzing feed", 380) +
        p("The posts that got people talking over the last seven days. Caught up in one scroll.") +
        emailPostList(a.items),
      cta: { label: "Open the community", href: `${SITE}/community` },
    }),
    text:
      `This week in the community:\n\n` +
      a.items.map((x) => `• ${x.title} — ${x.href}`).join("\n") +
      `\n\n${SITE}/community`,
  };
}
