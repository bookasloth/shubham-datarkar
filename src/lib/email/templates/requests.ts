import { renderEmail, emailGif, emailDetails } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Member request received. Humour: Subtle. */
export function requestReceived(a: { name?: string | null; kind: string; title: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Got it. It reached me.",
    html: renderEmail({
      preheader: "Your request is in. A human will actually read it.",
      headerTagline: "Requests",
      title: "Got it. It reached me.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Got your request.") +
        emailDetails([
          { label: "Type", value: esc(a.kind) },
          { label: "Request", value: esc(a.title) },
        ]) +
        p("I go through these myself, so it may not magically happen tomorrow morning.") +
        p("But it is on the list.") +
        p("If anything changes, you'll hear from me."),
      cta: { label: "See my requests", href: `${SITE}/members/requests` },
      afterCta: emailGif(EMAIL_GIFS.requestReceived, "A note dropping into an inbox tray", 340),
    }),
    text: `Hey ${first}, got your ${a.kind} request "${a.title}". I go through these myself — it's on the list, and you'll hear from me if anything changes. ${SITE}/members/requests`,
  };
}

/** Request approved. Humour: High. */
export function requestApproved(a: { name?: string | null; title: string; note?: string; href?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Fine. You convinced me.",
    html: renderEmail({
      preheader: "Your request has officially made the cut.",
      headerTagline: "Requests",
      title: "Fine. You convinced me.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Remember this?") +
        `<p style="margin:0 0 16px; font-size:16px; font-weight:600; color:#202124;">${esc(a.title)}</p>` +
        p("Good news.") +
        p("I liked the idea enough to actually do something about it.") +
        (a.note ? p(esc(a.note)) : "") +
        p("Your request is officially approved."),
      cta: { label: "See what happened", href: a.href || `${SITE}/members/requests` },
      afterCta: emailGif(EMAIL_GIFS.requestApproved, "A green light switching on", 340),
    }),
    text: `Hey ${first}, your request "${a.title}" is officially approved.${a.note ? ` ${a.note}` : ""} See what happened: ${a.href || `${SITE}/members/requests`}`,
  };
}

/** Request declined. Humour: None (gracious, not flippant). */
export function requestDeclined(a: { name?: string | null; title: string; reason?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "About that thing you requested",
    html: renderEmail({
      preheader: "Not every idea makes it through. Here's where this one landed.",
      headerTagline: "Requests",
      title: "About that thing you requested",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("I looked at your request:") +
        `<p style="margin:0 0 16px; font-size:16px; font-weight:600; color:#202124;">${esc(a.title)}</p>` +
        p("I'm not taking this one forward right now.") +
        (a.reason ? p(esc(a.reason)) : "") +
        p("That doesn't necessarily mean \"never.\"") +
        p("It just means it doesn't make sense for me to build it today.") +
        p("Still glad you asked.") +
        p("Seriously, keep sending things."),
      cta: { label: "Send me another idea", href: `${SITE}/members/requests` },
      afterCta: emailGif(EMAIL_GIFS.requestDeclined, "A gentle, respectful nod", 340),
    }),
    text: `Hey ${first}, I looked at your request "${a.title}" and I'm not taking it forward right now.${a.reason ? ` ${a.reason}` : ""} Not "never" — just not today. Keep sending ideas: ${SITE}/members/requests`,
  };
}
