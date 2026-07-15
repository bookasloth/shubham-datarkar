import { renderEmail, emailGif } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Contact form confirmation to the visitor. Humour: Subtle. */
export function contactConfirmation(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Got your message.",
    html: renderEmail({
      preheader: "It reached a human. Reply's coming.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: `Thanks, ${esc(first)} — got it.`,
      bodyHtml:
        emailGif(EMAIL_GIFS.contactConfirmation, "A message arriving with a soft ping", 340) +
        p("Your message reached me — a real person, not a ticket number. I read every one and usually reply within a business day, often sooner.") +
        p("No need to send it twice. I'm on it."),
    }),
    text: `Thanks ${first} — got your message. I read every one and reply within a business day, usually sooner. — Shubham`,
  };
}

/** Reply to a project inquiry. Humour: Subtle. */
export function projectInquiry(a: { name?: string | null; message: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "About your project",
    html: renderEmail({
      preheader: "A reply on the project you asked about.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: `Hi ${esc(first)},`,
      bodyHtml:
        emailGif(EMAIL_GIFS.projectInquiry, "Two hands meeting in a handshake", 340) +
        `<p style="margin:0 0 18px; font-size:14px; color:#2d2d2d; line-height:1.7; white-space:pre-wrap;">${esc(a.message)}</p>` +
        `<p style="margin:0; font-size:14px; color:#2d2d2d; line-height:1.7;">— Shubham</p>`,
      cta: { label: "Book a call", href: `${SITE}/contact` },
    }),
    text: `Hi ${first},\n\n${a.message}\n\n— Shubham\n\nBook a call: ${SITE}/contact`,
  };
}
