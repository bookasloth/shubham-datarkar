/** Warm, monochrome birthday note. No offer, no images — just a personal line. */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function birthdayEmail(fullName: string | null): {
  subject: string;
  html: string;
  text: string;
} {
  const first = fullName?.trim().split(/\s+/)[0] || "there";
  const safe = escapeHtml(first);
  const subject = `Happy birthday, ${first}!`;

  const text = `Hi ${first},

Just a quick note to wish you a very happy birthday.

Thank you for being part of what I'm building here — it genuinely means a lot to have you around. Hope your day is a good one.

— Shubham`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.6;font-size:15px">
  <p>Hi ${safe},</p>
  <p>Just a quick note to wish you a very happy birthday.</p>
  <p>Thank you for being part of what I'm building here — it genuinely means a lot to have you around. Hope your day is a good one.</p>
  <p style="margin-top:24px">— Shubham</p>
</div>`;

  return { subject, html, text };
}
