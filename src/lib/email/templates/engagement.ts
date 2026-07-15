import { renderEmail, emailGif } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Introduction — auto-sent ~24h after signup/subscription. Humour: High. */
export function introduction(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Right. I should probably introduce myself.",
    html: renderEmail({
      preheader: "You joined yesterday. I forgot the part where I say hello properly.",
      headerTagline: "Shubham Datarkar",
      title: "Right. I should probably introduce myself.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("You joined yesterday.") +
        p("I welcomed you to the website.") +
        p("But I never actually introduced myself, which feels slightly rude.") +
        p("I'm Shubham.") +
        p("I write the things here, build the games, make the resources, run the community, and occasionally spend six hours fixing something nobody will ever notice.") +
        p("This website is basically where all my internet rabbit holes eventually end up.") +
        p("If you're wondering where to start:") +
        p("Read something.") +
        p("Play something.") +
        p("Say something in the community.") +
        p("Or do absolutely none of that and just click around.") +
        p("I'm not your manager."),
      cta: { label: "Show me something interesting", href: SITE },
      afterCta: emailGif(EMAIL_GIFS.introduction, "A friendly hello, hand extended"),
    }),
    text: `Hey ${first}, you joined yesterday and I never properly said hi. I'm Shubham — I write the things here, build the games, make the resources, run the community. Where to start: read something, play something, say something. Or just click around, I'm not your manager. ${SITE}`,
  };
}

/** We miss you (dormant a while). Humour: Subtle — warm, not needy. */
export function weMissYou(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "You alive?",
    html: renderEmail({
      preheader: "No guilt trip. Just checking whether the internet stole you.",
      headerTagline: "Shubham Datarkar",
      title: "You alive?",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("It's been a while since you dropped by.") +
        p("I'm assuming you've been busy doing important things.") +
        p("Or watching 47 short videos you don't remember.") +
        p("Either way, a fair bit has changed since you were last here.") +
        p("New writing. New community posts. New games. New things to click instead of doing whatever you were supposed to be doing.") +
        p("Come see what you missed.") +
        p("Whenever.") +
        p("No attendance sheet here."),
      cta: { label: "What did I miss?", href: SITE },
      afterCta: emailGif(EMAIL_GIFS.weMissYou, "A chair waiting by an open door"),
    }),
    text: `Hey ${first}, it's been a while. New writing, new community posts, new games since you were last here. No guilt trip, no attendance sheet — come see what you missed whenever: ${SITE}`,
  };
}

/** Inactive account — never finished setup / verified. Humour: Subtle. */
export function inactiveAccount(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "You started. Then disappeared.",
    html: renderEmail({
      preheader: "Your account is sitting here half-dressed.",
      headerTagline: "Shubham Datarkar",
      title: "You started. Then disappeared.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("You created an account but never finished setting it up.") +
        p("So right now, your profile is basically an apartment with one plastic chair in the middle.") +
        p("Functional.") +
        p("Technically.") +
        p("It takes about two minutes to finish.") +
        p("Probably less if you don't overthink your bio."),
      cta: { label: "Finish this thing", href: `${SITE}/members/account` },
      afterCta: emailGif(EMAIL_GIFS.inactiveAccount, "A checklist with one box left"),
    }),
    text: `Hey ${first}, you created an account but never finished setup — right now it's an apartment with one plastic chair. Two minutes to finish: ${SITE}/members/account`,
  };
}

/** Birthday. Humour: High but warm. */
export function birthday(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `Happy birthday, ${first} 🎂`,
    html: renderEmail({
      preheader: "No coupon code hiding inside. Promise.",
      headerTagline: "Shubham Datarkar",
      title: `Happy birthday, ${esc(first)}.`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Happy birthday.") +
        p("That's it.") +
        p("No 20% OFF BIRTHDAY20.") +
        p("No limited-time birthday bundle.") +
        p("No strategically timed upsell disguised as affection.") +
        p("Just hoping you have a genuinely good day.") +
        p("Eat something nice.") +
        p("Do less work.") +
        p("Ignore at least one unnecessary notification.") +
        p("Happy birthday.") +
        `<p style="margin:0 0 16px; font-size:14px; color:#2d2d2d; line-height:1.7;">Shubham</p>`,
      cta: { label: "Waste 10 minutes responsibly", href: `${SITE}/games` },
      afterCta: emailGif(EMAIL_GIFS.birthday, "A little birthday cake with a candle"),
    }),
    text: `Hey ${first}, happy birthday. That's it — no coupon, no bundle, no upsell disguised as affection. Just hoping you have a genuinely good day. Eat something nice, do less work. — Shubham`,
  };
}

/** Festival greeting. Humour: Subtle/warm. Parameterised by festival. */
export function festival(a: { name?: string | null; festival: string; message?: string }): RenderedEmail {
  const first = firstName(a.name);
  const fest = esc(a.festival);
  return {
    subject: `Happy ${a.festival}, ${first}`,
    html: renderEmail({
      preheader: "Just a small note from my side.",
      headerTagline: "Shubham Datarkar",
      title: `Happy ${fest}, ${esc(first)}`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p(`Happy ${fest}.`) +
        (a.message ? p(esc(a.message)) : p("No announcement.") + p("No offer ending at midnight.") + p("Just wishing you and your people a warm, happy one.")) +
        p("Take the day slightly slower if you can.") +
        `<p style="margin:0 0 16px; font-size:14px; color:#2d2d2d; line-height:1.7;">Shubham</p>`,
      cta: { label: "Visit when you're bored later", href: SITE },
      afterCta: emailGif(EMAIL_GIFS.festival, `Warm ${fest} celebration lights`),
    }),
    text: `Hey ${first}, happy ${a.festival}. ${a.message || "No announcement, no offer ending at midnight — just wishing you and your people a warm, happy one."} Take the day slightly slower if you can. — Shubham`,
  };
}
