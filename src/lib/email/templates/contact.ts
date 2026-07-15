import { renderEmail, emailGif } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Contact form confirmation to the visitor. Humour: Subtle. */
export function contactConfirmation(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Yep. I got it.",
    html: renderEmail({
      preheader: "Your message reached an actual human.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "Yep. I got it.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Got your message.") +
        p("It did not disappear into a mysterious support ticket dimension.") +
        p("It reached me.") +
        p("I read every message myself and usually reply within one business day.") +
        p("Sometimes faster.") +
        p("Sometimes I'm staring at the reply for 20 minutes trying to make one sentence sound normal.") +
        p("Either way, you'll hear back.") +
        p("No need to send it twice."),
      cta: { label: "Go do something else", href: SITE },
      afterCta: emailGif(EMAIL_GIFS.contactConfirmation, "A message arriving with a soft ping", 340),
    }),
    text: `Hey ${first}, got your message — it reached a real human, not a support ticket dimension. I read every one myself and usually reply within a business day. You'll hear back; no need to send it twice.`,
  };
}

/** Reply to a project inquiry. Humour: Subtle. */
export function projectInquiry(a: { name?: string | null; message: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "About your project",
    html: renderEmail({
      preheader: "I read what you sent. Here's what I think.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "About your project",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        `<p style="margin:0 0 16px; font-size:14px; color:#2d2d2d; line-height:1.7; white-space:pre-wrap;">${esc(a.message)}</p>` +
        p("If this sounds like something worth talking through properly, pick a time that works for you.") +
        p("We'll talk.") +
        p("No 48-slide sales deck involved.") +
        `<p style="margin:0 0 16px; font-size:14px; color:#2d2d2d; line-height:1.7;">Shubham</p>`,
      cta: { label: "Let's talk", href: `${SITE}/contact` },
      afterCta: emailGif(EMAIL_GIFS.projectInquiry, "Two hands meeting in a handshake", 340),
    }),
    text: `Hey ${first},\n\n${a.message}\n\nIf it's worth talking through properly, pick a time that works — no 48-slide sales deck. — Shubham\n\n${SITE}/contact`,
  };
}
