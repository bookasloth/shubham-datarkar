import { renderEmail, emailGif, emailDetails, emailPostList } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Membership activated. Humour: High. */
export function membershipActivated(a: { name?: string | null; planName: string }): RenderedEmail {
  const first = firstName(a.name);
  const plan = esc(a.planName);
  return {
    subject: "The locks are gone.",
    html: renderEmail({
      preheader: `Your ${plan} membership is now active.`,
      headerTagline: "Membership",
      title: "The locks are gone.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p(`You're officially a ${plan} member.`) +
        p("Which means all those little locks you kept seeing?") +
        p("Gone.") +
        p("Templates, resources, downloads, tools, and everything else reserved for members are now yours to explore.") +
        p("I'd start with the library.") +
        p("Mostly because I spent an unreasonable amount of time putting things in there."),
      cta: { label: "Open the members library", href: `${SITE}/members` },
      afterCta: emailGif(EMAIL_GIFS.membershipActivated, "A member badge lighting up"),
    }),
    text: `Hey ${first}, you're officially a ${a.planName} member — every lock is gone. Templates, resources, downloads, tools, all yours. Start with the library: ${SITE}/members`,
  };
}

/** Renewal reminder. Humour: Subtle (useful, not naggy). */
export function renewalReminder(a: { name?: string | null; planName: string; renewsOn: string; amount?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Tiny heads-up about your membership",
    html: renderEmail({
      preheader: `Your membership renews on ${esc(a.renewsOn)}. No surprises around here.`,
      headerTagline: "Membership",
      title: "Tiny heads-up about your membership",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Quick heads-up.") +
        p(`Your ${esc(a.planName)} membership renews on <strong>${esc(a.renewsOn)}</strong>${a.amount ? ` for <strong>${esc(a.amount)}</strong>` : ""}.`) +
        p("You don't need to do anything.") +
        p("I'm just telling you now because surprise charges are a terrible way to maintain a friendship.") +
        emailDetails([
          { label: "Plan", value: esc(a.planName) },
          { label: "Renews", value: esc(a.renewsOn) },
          ...(a.amount ? [{ label: "Amount", value: esc(a.amount) }] : []),
        ]),
      cta: { label: "Manage my membership", href: `${SITE}/members/account` },
      afterCta: emailGif(EMAIL_GIFS.renewalReminder, "A calendar page and a gentle clock", 360),
    }),
    text: `Hey ${first}, quick heads-up: your ${a.planName} membership renews on ${a.renewsOn}${a.amount ? ` for ${a.amount}` : ""}. Nothing to do — just no surprise charges. Manage it: ${SITE}/members/account`,
  };
}

/** Renewed successfully. Humour: Subtle (light celebration). */
export function membershipRenewed(a: { name?: string | null; planName: string; nextRenewal?: string; amount?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Another year. Still here.",
    html: renderEmail({
      preheader: "Membership renewed. Nothing broke. Carry on.",
      headerTagline: "Membership",
      title: "Another year. Still here.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p(`Your ${esc(a.planName)} membership has been renewed.`) +
        p("No interruption. No doors suddenly locking behind you.") +
        p(`${a.amount ? `You've been charged <strong>${esc(a.amount)}</strong>, and your` : "Your"} next renewal is${a.nextRenewal ? ` <strong>${esc(a.nextRenewal)}</strong>` : " a year away"}.`) +
        p("That's the entire update.") +
        p("Back to whatever you were doing."),
      cta: { label: "Back to the good stuff", href: `${SITE}/members` },
      afterCta: emailGif(EMAIL_GIFS.membershipRenewed, "A checkmark landing softly", 340),
    }),
    text: `Hey ${first}, your ${a.planName} membership renewed — no interruption.${a.amount ? ` Charged ${a.amount}.` : ""}${a.nextRenewal ? ` Next renewal ${a.nextRenewal}.` : ""} Back to the good stuff: ${SITE}/members`,
  };
}

/** Payment failed. Humour: None (calm + helpful). */
export function paymentFailed(a: { name?: string | null; planName: string; retryUrl?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Your payment did a small backflip",
    html: renderEmail({
      preheader: "It didn't go through. Usually an easy fix.",
      headerTagline: "Membership",
      title: "Your payment did a small backflip",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p(`Your ${esc(a.planName)} membership payment didn't go through.`) +
        p("Usually, it's something boring. An expired card, a bank check, the financial system having one of its little moments.") +
        p("Your access is still active for now.") +
        p("Update your payment method and we'll try again."),
      cta: { label: "Fix the payment thing", href: a.retryUrl || `${SITE}/members/account` },
      afterCta: emailGif(EMAIL_GIFS.paymentFailed, "A card and a small retry prompt", 340),
    }),
    text: `Hey ${first}, your ${a.planName} payment didn't go through — usually an expired card. Access is still active for now. Update your payment method: ${a.retryUrl || `${SITE}/members/account`}`,
  };
}

/** Membership ended (cancelled / not renewing / paused-out). Humour: Subtle, no guilt. */
export function membershipEnded(a: { name?: string | null; planName: string }): RenderedEmail {
  const first = firstName(a.name);
  const plan = esc(a.planName);
  return {
    subject: "Your membership just clocked out",
    html: renderEmail({
      preheader: `Your ${plan} membership has ended. The door's still unlocked whenever.`,
      headerTagline: "Membership",
      title: "Your membership just clocked out",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p(`Your ${plan} membership has ended, so the members-only bits are behind their little locks again.`) +
        p("No hard feelings.") +
        p("No 'are you SURE' popup chasing you around.") +
        p("Everything you can reach without a membership is still exactly where you left it.") +
        p("And if you ever want back in, it's one click away."),
      cta: { label: "Restart my membership", href: `${SITE}/members` },
      afterCta: emailGif(EMAIL_GIFS.membershipEnded, "A door quietly closing", 340),
    }),
    text: `Hey ${first}, your ${a.planName} membership has ended — the members-only bits are locked again. No hard feelings. Whenever you want back in, it's one click: ${SITE}/members`,
  };
}

/** New members-only resource. Humour: Subtle. */
export function newMemberResource(a: { name?: string | null; title: string; href: string; kind?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "I added something new behind the lock",
    html: renderEmail({
      preheader: `${esc(a.title)} is now in the members library.`,
      headerTagline: "Members only",
      title: "I added something new behind the lock",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("I just added something new to the members library:") +
        `<p style="margin:0 0 18px; font-size:16px; font-weight:600; color:#202124;">${esc(a.title)}</p>` +
        p("Everyone else gets a little lock icon.") +
        p("You get the actual thing.") +
        p("Membership has its moments."),
      cta: { label: "Give me the thing", href: a.href },
      afterCta: emailGif(EMAIL_GIFS.newResource, "A gift being unwrapped", 340),
    }),
    text: `Hey ${first}, new in the members library: ${a.title}. Everyone else gets a lock icon; you get the actual thing. Grab it: ${a.href}`,
  };
}

/** Monthly member digest. Humour: Subtle. */
export function memberDigest(a: { monthLabel: string; items: { title: string; href: string; meta?: string }[] }): RenderedEmail {
  return {
    subject: `Your ${a.monthLabel} member drop has landed`,
    html: renderEmail({
      preheader: "Everything new I added this month, minus the searching.",
      headerTagline: "Monthly member digest",
      title: `Your ${esc(a.monthLabel)} member drop has landed`,
      bodyHtml:
        p("Hey there,") +
        p("I added a bunch of things to the members library this month.") +
        p("Rather than making you hunt for them, here they are:") +
        emailPostList(a.items) +
        p("Download what you need.") +
        p("Ignore what you don't.") +
        p("Come back when future-you suddenly needs that one template you skipped."),
      cta: { label: "See everything new", href: `${SITE}/members` },
      afterCta: emailGif(EMAIL_GIFS.memberDigest, "A shelf of resources filling up", 380),
    }),
    text:
      `Your ${a.monthLabel} member drop:\n\n` +
      a.items.map((x) => `• ${x.title} — ${x.href}`).join("\n") +
      `\n\n${SITE}/members`,
  };
}

/** Gifted membership. Humour: High. */
export function membershipGift(a: { planName: string }): RenderedEmail {
  const plan = esc(a.planName);
  return {
    subject: "Someone likes you enough to pay for this",
    html: renderEmail({
      preheader: `You've been gifted a ${plan} membership.`,
      headerTagline: "A gift for you",
      title: "Someone likes you enough to pay for this",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p("Hey there,") +
        p(`Someone just gifted you a <strong>${plan} membership</strong>.`) +
        p("Very nice of them, frankly.") +
        p("You now have access to the members library, premium resources, templates, downloads, tools, and everything else hiding behind the lock.") +
        p("Nothing to pay.") +
        p("No card required.") +
        p("Just sign in with this email and enjoy your suspiciously good fortune."),
      cta: { label: "Unwrap my membership", href: `${SITE}/members` },
      afterCta: emailGif(EMAIL_GIFS.membershipGift, "A wrapped gift with a bow"),
    }),
    text: `Someone gifted you a ${a.planName} membership — the whole members library, premium resources, templates, downloads, tools. Nothing to pay, no card. Sign in with this email: ${SITE}/members`,
  };
}
