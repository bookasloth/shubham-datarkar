import { renderEmail, emailGif } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Account created / welcome. Humour: High. */
export function accountWelcome(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "You're in. Welcome aboard.",
    html: renderEmail({
      preheader: "Account created. One less password to invent tonight.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: `Hey ${esc(first)}, you're in.`,
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.accountWelcome, "A friendly hello wave") +
        p("Your account is live. No confetti cannon here — just a clean space to read, play, and build alongside a few thousand other people who care about doing good work.") +
        p("Have a look around whenever you're ready. That's the whole onboarding."),
      cta: { label: "Take a look around", href: SITE },
    }),
    text: `Hey ${first}, you're in.\n\nYour account is live. Have a look around whenever you're ready: ${SITE}\n\n— Shubham`,
  };
}

/** Forgot password. Humour: None (security — clarity first). */
export function forgotPassword(a: { name?: string | null; resetUrl: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Reset your password",
    html: renderEmail({
      preheader: "A link to set a new password. Expires soon.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "Reset your password",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.forgotPassword, "A key turning in a lock") +
        p(`Hi ${esc(first)}, we got a request to reset your password. Click below to set a new one — the link expires in an hour.`) +
        p('If you didn\'t ask for this, you can ignore this email. Your password stays exactly as it is.'),
      cta: { label: "Set a new password", href: a.resetUrl },
    }),
    text: `Hi ${first},\n\nReset your password using this link (expires in 1 hour):\n${a.resetUrl}\n\nDidn't request it? Ignore this email — nothing changes.`,
  };
}

/** Password changed confirmation. Humour: Subtle. */
export function passwordChanged(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "New password. Same you.",
    html: renderEmail({
      preheader: "Your password was just changed.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "Your password was changed",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.passwordChanged, "A padlock clicking shut") +
        p(`Hi ${esc(first)}, your password was just updated. Your old one has officially retired.`) +
        p("If this was you, you're all set — no action needed. If it wasn't, reset your password immediately and get in touch."),
      cta: { label: "Secure my account", href: `${SITE}/forgot-password` },
    }),
    text: `Hi ${first},\n\nYour password was just changed. If this was you, nothing to do. If not, reset it right away: ${SITE}/forgot-password`,
  };
}

/** Comment email-verification OTP. Humour: None (extremely short + clear). */
export function commentOtp(a: { code: string }): RenderedEmail {
  return {
    subject: `Your verification code: ${a.code}`,
    html: renderEmail({
      preheader: "Your one-time code. Expires in 10 minutes.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "Verify your email",
      footerNote: TXN_FOOTER,
      bodyHtml:
        emailGif(EMAIL_GIFS.otp, "A code being entered", 320) +
        p("Enter this code to post your comment:") +
        `<p style="margin:0 0 16px; font-size:30px; font-weight:700; letter-spacing:6px; color:#202124;">${esc(a.code)}</p>` +
        `<p style="margin:0; font-size:13px; color:#5f6368;">Expires in 10 minutes. Didn't request it? Ignore this email.</p>`,
    }),
    text: `Your verification code is ${a.code}. It expires in 10 minutes.`,
  };
}
