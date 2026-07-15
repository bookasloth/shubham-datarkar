import { renderEmail, emailGif } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Introduction — auto-sent ~24h after signup/subscription. A proper hello from
 *  Shubham once the confetti of the welcome email has settled. Humour: High. */
export function introduction(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "So, hi — properly this time",
    html: renderEmail({
      preheader: "A day in. Here's who's behind all this, and where to start.",
      headerTagline: "Shubham Datarkar",
      title: `A proper hello, ${esc(first)}.`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.introduction, "A friendly hello, hand extended") +
        p("You signed up yesterday, got the welcome note, and probably clicked around a bit. So now that the dust has settled — hi, I'm Shubham. This whole place is mine: the writing, the games, the community, the occasionally-strong opinions.") +
        p("If you only do three things: read something on the blog, say one thing in the community, and lose ten minutes to a game. That's the tour.") +
        p("Reply to this any time — it comes to a real inbox, and I read it.") +
        `<p style="margin:0; font-size:14px; color:#2d2d2d; line-height:1.7;">— Shubham</p>`,
      cta: { label: "Start with what's new", href: SITE },
    }),
    text: `A proper hello, ${first}. I'm Shubham — the writing, games, and community here are all mine. If you do three things: read something on the blog, post one thing in the community, lose ten minutes to a game. Reply any time, I read it. — Shubham  ${SITE}`,
  };
}

/** We miss you (dormant a while). Humour: Subtle — warm, not needy. */
export function weMissYou(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "It's been a minute",
    html: renderEmail({
      preheader: "No guilt trip. Just a note that the door's open.",
      headerTagline: "Shubham Datarkar",
      title: `It's been a while, ${esc(first)}.`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.weMissYou, "A chair waiting by an open door") +
        p("Not here to guilt-trip you — life gets full. Just a note to say a fair bit has happened since you last dropped by: new writing, new posts in the community, and a couple of games worth losing ten minutes to.") +
        p("Whenever you've got a spare moment, we'll be here."),
      cta: { label: "See what's new", href: SITE },
    }),
    text: `It's been a while, ${first}. New writing, new community posts, and a couple of games since you last visited. Come see: ${SITE}`,
  };
}

/** Inactive account — never finished setup / verified. Humour: Subtle. */
export function inactiveAccount(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Your account's half-built",
    html: renderEmail({
      preheader: "You started something. Two minutes to finish it.",
      headerTagline: "Shubham Datarkar",
      title: "Let's finish setting you up",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.inactiveAccount, "A checklist with one box left") +
        p(`Hi ${esc(first)}, you created an account but never quite finished the setup — so right now it's a bit like a house with no furniture.`) +
        p("It takes about two minutes to round it out and start actually using the good stuff."),
      cta: { label: "Finish setting up", href: `${SITE}/members/account` },
    }),
    text: `Hi ${first}, you started an account but never finished setup. Two minutes to round it out: ${SITE}/members/account`,
  };
}

/** Birthday. Humour: High but warm. */
export function birthday(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `Happy birthday, ${first}!`,
    html: renderEmail({
      preheader: "One quick note on your day.",
      headerTagline: "Shubham Datarkar",
      title: `Happy birthday, ${esc(first)}.`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.birthday, "A little birthday cake with a candle") +
        p("Just a quick note to wish you a genuinely good one. No offer attached, no fine print — that would be a strange birthday gift.") +
        p("Thanks for being part of what I'm building here. It means more than a form email can say. Enjoy your day.") +
        `<p style="margin:0; font-size:14px; color:#2d2d2d; line-height:1.7;">— Shubham</p>`,
    }),
    text: `Happy birthday, ${first}. Just a note to wish you a good one — no offer, no fine print. Thanks for being part of what I'm building here. — Shubham`,
  };
}

/** Festival greeting. Humour: Subtle/warm. Parameterised by festival. */
export function festival(a: { name?: string | null; festival: string; message?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `Happy ${a.festival}!`,
    html: renderEmail({
      preheader: `A little ${a.festival} note from my side.`,
      headerTagline: "Shubham Datarkar",
      title: `Happy ${esc(a.festival)}, ${esc(first)}.`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.festival, `Warm ${esc(a.festival)} celebration lights`) +
        p(a.message ? esc(a.message) : `Wishing you and yours a bright, warm ${esc(a.festival)}. Whatever the day looks like for you, I hope it's a good one.`) +
        `<p style="margin:0; font-size:14px; color:#2d2d2d; line-height:1.7;">— Shubham</p>`,
    }),
    text: `Happy ${a.festival}, ${first}. ${a.message || `Wishing you and yours a bright, warm ${a.festival}.`} — Shubham`,
  };
}
