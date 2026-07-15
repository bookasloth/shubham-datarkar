import { renderEmail, emailGif, emailPostList } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, p } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

type Post = { title: string; href: string; meta?: string };

/** Builders List subscription confirmed. Humour: High. */
export function newsletterWelcome(): RenderedEmail {
  return {
    subject: "You're on the Builders List.",
    html: renderEmail({
      preheader: "Ad breakdowns, growth frameworks, and the odd hard truth.",
      title: "Welcome to the Builders List.",
      bodyHtml:
        emailGif(EMAIL_GIFS.newsletterWelcome, "A mailbox flag popping up") +
        p("You just joined a small crowd of builders and marketers who'd rather learn what actually works than read another thread of recycled advice.") +
        p("Here's the deal: ad breakdowns, SEO and growth frameworks you can use the same day, build logs from real projects, and the occasional opinion I probably shouldn't say out loud.") +
        p("As a subscriber you also get resources I don't share anywhere else. Grab them below."),
      cta: { label: "Open the subscriber vault", href: `${SITE}/subscriber-assets` },
    }),
    text: `You're on the Builders List.\n\nExpect ad breakdowns, growth frameworks, build logs, and subscriber-only resources. Your goodies live here: ${SITE}/subscriber-assets`,
  };
}

/** Weekly "new blogs this week" digest (Tue→Mon). Humour: Subtle. */
export function newBlogs(a: { posts: Post[] }): RenderedEmail {
  const count = a.posts.length;
  return {
    subject: count === 1 ? "One new read this week" : `${count} new reads this week`,
    html: renderEmail({
      preheader: "Fresh from the week. Pick one, ignore the rest — no pressure.",
      headerTagline: "This week's writing",
      title: count === 1 ? "One thing worth reading" : `${count} things worth reading`,
      bodyHtml:
        emailGif(EMAIL_GIFS.newBlogs, "A stack of fresh articles", 380) +
        p("Everything I published since last Tuesday, in one place. Read what catches your eye and skip the rest — I won't know.") +
        emailPostList(a.posts),
      cta: { label: "Read on the blog", href: `${SITE}/blog` },
    }),
    text:
      `New this week:\n\n` +
      a.posts.map((x) => `• ${x.title} — ${x.href}`).join("\n") +
      `\n\nMore at ${SITE}/blog`,
  };
}

/** Monthly roundup. Humour: Subtle. */
export function monthlyRoundup(a: { monthLabel: string; posts: Post[] }): RenderedEmail {
  return {
    subject: `${a.monthLabel}, wrapped`,
    html: renderEmail({
      preheader: "The month's best bits, so you don't have to scroll for them.",
      headerTagline: "Monthly roundup",
      title: `${esc(a.monthLabel)}, in one scroll`,
      bodyHtml:
        emailGif(EMAIL_GIFS.monthlyRoundup, "Pages flipping through a calendar month", 380) +
        p("A whole month happened. Here are the pieces worth your time, saved from the scroll.") +
        emailPostList(a.posts),
      cta: { label: "See everything", href: `${SITE}/blog` },
    }),
    text:
      `${a.monthLabel}, wrapped:\n\n` +
      a.posts.map((x) => `• ${x.title} — ${x.href}`).join("\n") +
      `\n\n${SITE}/blog`,
  };
}

/** Unsubscribe confirmation. Humour: Subtle (graceful exit). */
export function unsubscribed(): RenderedEmail {
  return {
    subject: "Done. You're unsubscribed.",
    html: renderEmail({
      preheader: "You're off the list. The door stays unlocked.",
      headerTagline: "Subscription updated",
      title: "You're unsubscribed.",
      bodyHtml:
        emailGif(EMAIL_GIFS.unsubscribe, "A friendly goodbye wave") +
        p("No more build logs, breakdowns, or growth frameworks landing in your inbox. No hard feelings, honestly.") +
        p("If it turns out you miss us, the door's unlocked — re-subscribe anytime."),
      cta: { label: "Actually, take me back", href: `${SITE}/subscribe` },
    }),
    text: `You're unsubscribed — no more newsletter. No hard feelings. Changed your mind? ${SITE}/subscribe`,
  };
}
