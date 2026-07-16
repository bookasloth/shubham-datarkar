import { renderEmail, emailGif } from "../template";
import { EMAIL_GIFS } from "../gifs";
import { type RenderedEmail, esc, firstName, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/** Confirm email address (signup). Humour: Subtle (it's a gate — clarity first). */
export function confirmEmail(a: { name?: string | null; confirmUrl: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Confirm your email — one click and you're in",
    html: renderEmail({
      preheader: "Quick tap to confirm it's really you. Then the door opens.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "Confirm your email address",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Almost there. I just need to know this inbox is actually yours.") +
        p("Tap the button below and your account is confirmed — that's the whole task.") +
        p("The link expires in 24 hours.") +
        p("If you didn't sign up, ignore this email. Nothing happens and no account gets created without this click."),
      cta: { label: "Confirm my email", href: a.confirmUrl },
      afterCta: emailGif(EMAIL_GIFS.confirmEmail, "An envelope being ticked as confirmed"),
    }),
    text: `Hey ${first},\n\nConfirm your email to finish signing up (link expires in 24 hours):\n${a.confirmUrl}\n\nDidn't sign up? Ignore this — nothing happens without the click.`,
  };
}

/** Account created / welcome. Humour: High. */
export function accountWelcome(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "You're in. That was easy.",
    html: renderEmail({
      preheader: "Account created. One less password to invent tonight.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "You're in. That was easy.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("You're in.") +
        p("Your account is officially alive, which sounds much more dramatic than what actually happened.") +
        p("No 17-step onboarding. No mandatory product tour. No person from sales appearing in your inbox asking for 15 minutes.") +
        p("Just come in, look around, read something, play something, build something.") +
        p("You'll figure the rest out."),
      cta: { label: "Have a look around", href: SITE },
      afterCta: emailGif(EMAIL_GIFS.accountWelcome, "A friendly hello wave"),
    }),
    text: `Hey ${first},\n\nYou're in. Your account is alive. No 17-step onboarding, no product tour, no sales call. Just come in, look around, read something, play something, build something.\n\nHave a look around: ${SITE}`,
  };
}

/** Forgot password. Humour: None (security — clarity first). */
export function forgotPassword(a: { name?: string | null; resetUrl: string }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "Forgot your password? Happens.",
    html: renderEmail({
      preheader: "Here's your way back in. This link expires soon.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "Forgot your password? Happens.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Someone asked us to reset your password.") +
        p("Hopefully, that someone was you.") +
        p("Click the button below, pick a new password, and maybe make this one slightly more memorable.") +
        p("The link expires in one hour.") +
        p("If you didn't request this, ignore the email. Nothing changes."),
      cta: { label: "Reset my password", href: a.resetUrl },
      afterCta: emailGif(EMAIL_GIFS.forgotPassword, "A key turning in a lock"),
    }),
    text: `Hey ${first},\n\nSomeone asked to reset your password — hopefully you. Set a new one (link expires in 1 hour):\n${a.resetUrl}\n\nDidn't request it? Ignore this email. Nothing changes.`,
  };
}

/** Password changed confirmation. Humour: Subtle. */
export function passwordChanged(a: { name?: string | null }): RenderedEmail {
  const first = firstName(a.name);
  return {
    subject: "New password. Same you.",
    html: renderEmail({
      preheader: "Your password has officially been changed.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "New password. Same you.",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p(`Hey ${esc(first)},`) +
        p("Your password was just changed.") +
        p("The old one has now been respectfully retired.") +
        p("If that was you, lovely. Nothing else to do.") +
        p("If it wasn't you, that's considerably less lovely. Reset your password immediately and get in touch with us."),
      cta: { label: "Secure my account", href: `${SITE}/forgot-password` },
      afterCta: emailGif(EMAIL_GIFS.passwordChanged, "A padlock clicking shut"),
    }),
    text: `Hey ${first},\n\nYour password was just changed. If that was you, nothing to do. If it wasn't, reset it immediately and get in touch: ${SITE}/forgot-password`,
  };
}

/** Comment email-verification OTP. Humour: None (short + clear). */
export function commentOtp(a: { code: string; returnUrl?: string }): RenderedEmail {
  return {
    subject: `Your code is ${a.code}`,
    html: renderEmail({
      preheader: "Six digits. Ten minutes. Try not to overthink it.",
      headerTagline: "<strong>Shubham Datarkar</strong>",
      title: "Here's your verification code",
      footerNote: TXN_FOOTER,
      bodyHtml:
        p("Here's your verification code:") +
        `<p style="margin:0 0 16px; font-size:30px; font-weight:700; letter-spacing:6px; color:#202124;">${esc(a.code)}</p>` +
        p("It expires in 10 minutes.") +
        p("Use it to post your comment.") +
        p("If you didn't request this, you can safely ignore this email and continue with your day."),
      cta: { label: "Go back to my comment", href: a.returnUrl || SITE },
      afterCta: emailGif(EMAIL_GIFS.otp, "A code being entered", 320),
    }),
    text: `Your verification code is ${a.code}. It expires in 10 minutes. Use it to post your comment. Didn't request it? Ignore this email.`,
  };
}
