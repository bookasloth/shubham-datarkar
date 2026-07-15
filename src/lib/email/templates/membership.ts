import { renderEmail, emailGif, emailDetails, emailPostList } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Membership activated. Humour: High. */
export function membershipActivated(a: { name?: string | null; planName: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `You're a ${a.planName} member now.`,
    html: renderEmail({
      preheader: "Membership active. Every locked door just opened.",
      headerTagline: "Membership",
      title: `Welcome to ${esc(a.planName)}, ${esc(first)}.`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.membershipActivated, "A member badge lighting up") +
        p("Your membership is active. Every template, download, and tool that used to have a little lock on it? Open now.") +
        p("Best way in is the members library. Bookmark it — you'll be back."),
      cta: { label: "Open the members library", href: `${SITE}/members` },
    }),
    text: `Welcome to ${a.planName}, ${first}. Your membership is active — everything's unlocked: ${SITE}/members`,
  };
}

/** Renewal reminder. Humour: Subtle (useful, not naggy). */
export function renewalReminder(a: { name?: string | null; planName: string; renewsOn: string; amount?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `Your membership renews ${a.renewsOn}`,
    html: renderEmail({
      preheader: "Just a heads-up so it's never a surprise.",
      headerTagline: "Membership",
      title: "A quick heads-up",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.renewalReminder, "A calendar page and a gentle clock", 360) +
        p(`Hi ${esc(first)}, your ${esc(a.planName)} membership renews soon. Nothing you need to do — this is just so the charge is never a surprise.`) +
        emailDetails([
          { label: "Plan", value: esc(a.planName) },
          { label: "Renews on", value: esc(a.renewsOn) },
          ...(a.amount ? [{ label: "Amount", value: esc(a.amount) }] : []),
        ]) +
        p("Want to make a change? You can manage everything from your account."),
      cta: { label: "Manage membership", href: `${SITE}/members/account` },
    }),
    text: `Hi ${first}, your ${a.planName} membership renews on ${a.renewsOn}${a.amount ? ` (${a.amount})` : ""}. Manage it: ${SITE}/members/account`,
  };
}

/** Renewed successfully. Humour: Subtle (light celebration). */
export function membershipRenewed(a: { name?: string | null; planName: string; nextRenewal?: string; amount?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Renewed. You're good to go.",
    html: renderEmail({
      preheader: "Payment received, membership rolled over. Nothing changes.",
      headerTagline: "Membership",
      title: "You're renewed.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.membershipRenewed, "A checkmark landing softly", 340) +
        p(`Thanks, ${esc(first)}. Your ${esc(a.planName)} membership just rolled over — same access, no interruptions.`) +
        emailDetails([
          { label: "Plan", value: esc(a.planName) },
          ...(a.amount ? [{ label: "Charged", value: esc(a.amount) }] : []),
          ...(a.nextRenewal ? [{ label: "Next renewal", value: esc(a.nextRenewal) }] : []),
        ]),
      cta: { label: "Back to the library", href: `${SITE}/members` },
    }),
    text: `Thanks ${first} — your ${a.planName} membership renewed. Same access, no interruptions. ${SITE}/members`,
  };
}

/** Payment failed. Humour: None (calm + helpful). */
export function paymentFailed(a: { name?: string | null; planName: string; retryUrl?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "We couldn't process your payment",
    html: renderEmail({
      preheader: "A payment didn't go through. Here's how to fix it.",
      headerTagline: "Membership",
      title: "Your payment didn't go through",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.paymentFailed, "A card and a small retry prompt", 340) +
        p(`Hi ${esc(first)}, we tried to process your ${esc(a.planName)} payment and it didn't go through. This happens — usually an expired card or a bank check.`) +
        p("Your access is still on for now. To keep it that way, update your payment method and we'll retry."),
      cta: { label: "Update payment method", href: a.retryUrl || `${SITE}/members/account` },
    }),
    text: `Hi ${first}, your ${a.planName} payment didn't go through — often an expired card. Access is still on for now. Update your payment method: ${a.retryUrl || `${SITE}/members/account`}`,
  };
}

/** New members-only resource. Humour: Subtle. */
export function newMemberResource(a: { name?: string | null; title: string; href: string; kind?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `New in the members library: ${a.title}`,
    html: renderEmail({
      preheader: "Fresh drop, members only. That's you.",
      headerTagline: "Members only",
      title: "Something new just dropped",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.newResource, "A gift being unwrapped", 340) +
        p(`Hi ${esc(first)}, there's a new ${esc(a.kind || "resource")} in the members library — the kind of thing that's behind the lock for everyone else, but not for you.`) +
        `<p style="margin:0 0 18px; font-size:16px; font-weight:600; color:#202124;">${esc(a.title)}</p>`,
      cta: { label: "Grab it now", href: a.href },
    }),
    text: `Hi ${first}, new in the members library: ${a.title}. Grab it: ${a.href}`,
  };
}

/** Monthly member digest. Humour: Subtle. */
export function memberDigest(a: { monthLabel: string; items: { title: string; href: string; meta?: string }[] }): RenderedEmail {
  return {
    subject: `Members: your ${a.monthLabel} drop`,
    html: renderEmail({
      preheader: "Everything that landed in the library this month.",
      headerTagline: "Monthly member digest",
      title: `${esc(a.monthLabel)} in the members library`,
      bodyHtml:
        emailGif(EMAIL_GIFS.memberDigest, "A shelf of resources filling up", 380) +
        p("Everything new behind the members lock this month, gathered in one place so nothing slips past you.") +
        emailPostList(a.items),
      cta: { label: "Open the library", href: `${SITE}/members` },
    }),
    text:
      `${a.monthLabel} in the members library:\n\n` +
      a.items.map((x) => `• ${x.title} — ${x.href}`).join("\n") +
      `\n\n${SITE}/members`,
  };
}

/** Gifted membership. Humour: High. */
export function membershipGift(a: { planName: string }): RenderedEmail {
  return {
    subject: `Someone gifted you ${a.planName}.`,
    html: renderEmail({
      preheader: "A membership, on the house. No catch.",
      headerTagline: "A gift for you",
      title: "You've been gifted premium.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.membershipGift, "A wrapped gift with a bow") +
        p(`You've been gifted <strong>${esc(a.planName)}</strong> — lifetime access to every premium resource, template, download, and tool in the members library.`) +
        p("Sign in with this email to unlock it. Nothing to pay, now or ever. Genuinely, that's the whole email."),
      cta: { label: "Unlock my gift", href: `${SITE}/members` },
    }),
    text: `You've been gifted ${a.planName} — lifetime premium access. Sign in with this email to unlock it, nothing to pay: ${SITE}/members`,
  };
}
