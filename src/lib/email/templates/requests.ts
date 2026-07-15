import { renderEmail, emailGif, emailDetails } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Member request received. Humour: Subtle. */
export function requestReceived(a: { name?: string | null; kind: string; title: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Got it — your request is in",
    html: renderEmail({
      preheader: "Landed safely. It's on the list.",
      headerTagline: "Requests",
      title: "Your request is in",
      bodyHtml:
        emailGif(EMAIL_GIFS.requestReceived, "A note dropping into an inbox tray", 340) +
        p(`Thanks ${esc(first)} — your request landed and it's on the list. I go through these personally, so it won't disappear into a void.`) +
        emailDetails([
          { label: "Type", value: esc(a.kind) },
          { label: "Request", value: esc(a.title) },
        ]) +
        p("You'll hear from me when there's an update. No need to send it again."),
      cta: { label: "See your requests", href: `${SITE}/members/requests` },
    }),
    text: `Thanks ${first} — your ${a.kind} request "${a.title}" is in and on the list. You'll hear from me with any update. ${SITE}/members/requests`,
  };
}

/** Request approved. Humour: High. */
export function requestApproved(a: { name?: string | null; title: string; note?: string; href?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `Approved: ${a.title}`,
    html: renderEmail({
      preheader: "Green light. Your request made the cut.",
      headerTagline: "Requests",
      title: "Good news — it's approved",
      bodyHtml:
        emailGif(EMAIL_GIFS.requestApproved, "A green light switching on", 340) +
        p(`Hey ${esc(first)}, your request <strong>"${esc(a.title)}"</strong> got the green light.`) +
        (a.note ? p(esc(a.note)) : p("Keep an eye out — it'll show up where you'd expect it.")),
      cta: a.href ? { label: "Take a look", href: a.href } : { label: "See your requests", href: `${SITE}/members/requests` },
    }),
    text: `Hey ${first}, your request "${a.title}" is approved.${a.note ? ` ${a.note}` : ""} ${a.href || `${SITE}/members/requests`}`,
  };
}

/** Request declined. Humour: None (gracious, not flippant). */
export function requestDeclined(a: { name?: string | null; title: string; reason?: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: `Update on your request: ${a.title}`,
    html: renderEmail({
      preheader: "An honest update on where this one landed.",
      headerTagline: "Requests",
      title: "An update on your request",
      bodyHtml:
        emailGif(EMAIL_GIFS.requestDeclined, "A gentle, respectful nod", 340) +
        p(`Hi ${esc(first)}, I looked at your request <strong>"${esc(a.title)}"</strong> and it's not something I can take on right now.`) +
        (a.reason ? p(esc(a.reason)) : p("It's not a no forever — priorities shift, and you're welcome to send it again down the line.")) +
        p("Thanks for taking the time to ask. It genuinely helps me see what people want."),
      cta: { label: "Send another request", href: `${SITE}/members/requests` },
    }),
    text: `Hi ${first}, your request "${a.title}" isn't something I can take on right now.${a.reason ? ` ${a.reason}` : ""} Thanks for asking — you're welcome to send another anytime: ${SITE}/members/requests`,
  };
}
