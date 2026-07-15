/**
 * Shared bits for the email template catalog. Each template is a pure function
 * returning a RenderedEmail; the HTML is always built through `renderEmail()` so
 * every email shares one branded shell.
 */

export type RenderedEmail = { subject: string; html: string; text: string };

/** Escape user-supplied values before they enter trusted `bodyHtml`. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** First name from a full name, falling back to a warm generic. */
export function firstName(full?: string | null, fallback = "there"): string {
  return full?.trim().split(/\s+/)[0] || fallback;
}

/** Wrap body paragraphs in the shell's standard paragraph style. */
export function p(html: string): string {
  return `<p style="margin:0 0 16px; font-size:14px; color:#2d2d2d; line-height:1.7;">${html}</p>`;
}

/** Footer note for transactional / lifecycle emails (not newsletter). */
export const TXN_FOOTER =
  "This is a service email about your account or activity on shubhamdatarkar.com. The address and links below are here if you need them.";
