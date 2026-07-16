import { renderEmail, emailGif, emailPostList } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, p } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

type Post = { title: string; href: string; meta?: string };

/** Builders List subscription confirmed. Humour: High. */
export function newsletterWelcome(a: { email?: string } = {}): RenderedEmail {
  // "Wasn't you?" escape hatch — prefills the address so it's one confirm click.
  const unsubUrl = a.email
    ? `${SITE}/unsubscribe?email=${encodeURIComponent(a.email)}`
    : `${SITE}/unsubscribe`;
  return {
    subject: "You're on the Builders List.",
    html: renderEmail({
      preheader: "Good stuff. Bad jokes. Useful things. Mostly in that order.",
      title: "You're on the Builders List.",
      bodyHtml:
        p("Hey there,") +
        p("You're officially on the Builders List.") +
        p("This means I'll occasionally appear in your inbox with things I found useful, built, broke, learned, or spent an unreasonable amount of time thinking about.") +
        p("Expect ad breakdowns, SEO and growth experiments, build logs, useful resources, and opinions I probably could've kept to myself.") +
        p("I won't email you just because Tuesday exists.") +
        p("Deal?"),
      cta: { label: "See what you've joined", href: `${SITE}/subscriber-assets` },
      afterCta:
        emailGif(EMAIL_GIFS.newsletterWelcome, "A mailbox flag popping up") +
        p(
          `Didn't sign up for this? No worries — someone may have typed your address by mistake. <a href="${unsubUrl}" style="color:#c43700; text-decoration:none;">Unsubscribe here</a> and you'll never hear from the list again.`,
        ),
    }),
    text: `You're on the Builders List. Ad breakdowns, SEO and growth experiments, build logs, useful resources, and the odd strong opinion — never just because it's Tuesday. See what you've joined: ${SITE}/subscriber-assets\n\nDidn't sign up? Unsubscribe here: ${unsubUrl}`,
  };
}

/** Weekly "new blogs this week" digest. Humour: Subtle. */
export function newBlogs(a: { posts: Post[] }): RenderedEmail {
  return {
    subject: "I wrote some things this week",
    html: renderEmail({
      preheader: "Read one. Read all. Pretend you'll read them later. All valid options.",
      headerTagline: "This week's writing",
      title: "I wrote some things this week",
      bodyHtml:
        p("Hey there,") +
        p("Apparently, I had thoughts again.") +
        p("Here's everything I published this week.") +
        emailPostList(a.posts) +
        p("Pick whatever catches your eye.") +
        p("Or open seven tabs and read none of them. I know how the internet works."),
      cta: { label: "See this week's writing", href: `${SITE}/blog` },
      afterCta: emailGif(EMAIL_GIFS.newBlogs, "A stack of fresh articles", 380),
    }),
    text:
      `I wrote some things this week:\n\n` +
      a.posts.map((x) => `• ${x.title} — ${x.href}`).join("\n") +
      `\n\nMore at ${SITE}/blog`,
  };
}

/** Monthly roundup. Humour: Subtle. */
export function monthlyRoundup(a: { monthLabel: string; posts: Post[] }): RenderedEmail {
  return {
    subject: `${a.monthLabel}, in case you missed half of it`,
    html: renderEmail({
      preheader: "The good bits from the month. The rest can stay buried.",
      headerTagline: "Monthly roundup",
      title: `${esc(a.monthLabel)}, in case you missed half of it`,
      bodyHtml:
        p("Hey there,") +
        p("Another month disappeared suspiciously quickly.") +
        p("I wrote things. Built things. Probably changed my mind about a few things.") +
        p("Here are the bits actually worth coming back to:") +
        emailPostList(a.posts) +
        p("That should save you approximately 47 minutes of scrolling.") +
        p("You're welcome."),
      cta: { label: `Catch up on ${esc(a.monthLabel)}`, href: `${SITE}/blog` },
      afterCta: emailGif(EMAIL_GIFS.monthlyRoundup, "Pages flipping through a calendar month", 380),
    }),
    text:
      `${a.monthLabel}, in case you missed half of it:\n\n` +
      a.posts.map((x) => `• ${x.title} — ${x.href}`).join("\n") +
      `\n\n${SITE}/blog`,
  };
}

/** Unsubscribe confirmation. Humour: Subtle (graceful exit). */
export function unsubscribed(): RenderedEmail {
  return {
    subject: "You escaped.",
    html: renderEmail({
      preheader: "You're off the list. No dramatic breakup email, promise.",
      headerTagline: "Subscription updated",
      title: "You escaped.",
      bodyHtml:
        p("You're unsubscribed.") +
        p("No more emails from the Builders List.") +
        p("No guilt trip. No \"before you go\" questionnaire with 14 required fields.") +
        p("If you ever change your mind, the door will still be there.") +
        p("Probably unlocked."),
      cta: { label: "I changed my mind", href: `${SITE}/subscribe` },
      afterCta: emailGif(EMAIL_GIFS.unsubscribe, "A friendly goodbye wave"),
    }),
    text: `You're unsubscribed — no more emails from the Builders List. No guilt trip. Changed your mind? The door's unlocked: ${SITE}/subscribe`,
  };
}
