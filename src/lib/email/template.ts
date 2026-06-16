/**
 * Branded email shell — the single source for the look of every email we send
 * (contact auto-reply, notifications, future receipts). Table-based + inline
 * styles for email-client compatibility; Poppins with Arial fallback.
 *
 * Pure string builder (no secrets / no server-only deps). `bodyHtml` is trusted
 * HTML the caller assembles — escape any user-supplied values before passing.
 */

export const EMAIL_BRAND = {
  name: "Shubham Datarkar's Newsletter",
  logoHeader: "https://company-assets.bookasloth.in/images/sd/email/shubham-logo-primary.png",
  logoFooter: "https://company-assets.bookasloth.in/images/sd/email/shubham-logo-secondary.png",
  welcomeGif: "https://company-assets.bookasloth.in/images/sd/email/welcome.gif",
  accent: "#ff4800",
  linkColor: "#c43700",
  company: ["Timewheel Internet Pvt Ltd", "2nd Floor, Eureka Coworking", "Mate Sqr, Nagpur, 440030"],
  links: [
    { label: "About", href: "https://shubhamdatarkar.com/about" },
    { label: "Help Center", href: "https://shubhamdatarkar.com/pages/help" },
    { label: "Privacy", href: "https://shubhamdatarkar.com/pages/privacy-policy" },
    { label: "Terms of Use", href: "https://shubhamdatarkar.com/pages/terms-of-use" },
    { label: "Unsubscribe", href: "https://shubhamdatarkar.com/pages/unsubscribe" },
  ],
} as const;

export type EmailCta = { label: string; href: string };

export type RenderEmailOptions = {
  /** Hidden inbox-preview text. */
  preheader: string;
  /** Main heading (h1). */
  title: string;
  /** Trusted HTML body (caller escapes any user values). */
  bodyHtml: string;
  /** Optional primary button. */
  cta?: EmailCta;
  /** Optional full-width hero image URL (e.g. the welcome gif). */
  heroImageUrl?: string;
  /** Right-side header label. Defaults to "Welcome to <brand>". */
  headerTagline?: string;
  /** Footer legal line. */
  footerNote?: string;
};

const DEFAULT_FOOTER_NOTE =
  "You're receiving this because you subscribed to Shubham Datarkar's Newsletter. If it ever stops being valuable, you can unsubscribe anytime. But I'll do my best to make sure that never happens.";

export function renderEmail(opts: RenderEmailOptions): string {
  const b = EMAIL_BRAND;
  const tagline = opts.headerTagline ?? `Welcome to <strong>${b.name}</strong>`;
  const footerNote = opts.footerNote ?? DEFAULT_FOOTER_NOTE;

  const ctaBlock = opts.cta
    ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="left" class="mobile-center">
                    <a href="${opts.cta.href}" class="cta-full" style="display:inline-block; padding:12px 24px; background:${b.accent}; color:#ffffff; border-radius:2px; font-size:15px; font-weight:500; text-decoration:none;">${opts.cta.label}</a>
                  </td>
                </tr>
              </table>`
    : "";

  const heroBlock = opts.heroImageUrl
    ? `
          <tr>
            <td align="center" style="padding:8px 8px 0 8px;">
              <img src="${opts.heroImageUrl}" alt="" style="width:100%; max-width:540px; border-radius:12px; margin-bottom:20px;">
            </td>
          </tr>`
    : "";

  const footerLinks = b.links
    .map(
      (l, i) =>
        `<a href="${l.href}" style="${i < b.links.length - 1 ? "margin-right:12px; " : ""}color:${b.linkColor}; text-decoration:none;">${l.label}</a>`,
    )
    .join("");

  const companyAddress = b.company.join("<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${b.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body, table, td, p, a { margin:0; padding:0; font-family:Poppins, Arial, Helvetica, sans-serif; }
    img { border:0; display:block; max-width:100%; height:auto; }
    table { border-collapse:collapse; }
    * { box-sizing:border-box; }
    .preheader { display:none; font-size:1px; color:#f3f5f7; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all; }
    @media screen and (max-width:640px) {
      .container { width:100% !important; max-width:100% !important; border-radius:0 !important; }
      .section-padding { padding-left:18px !important; padding-right:18px !important; }
      .footer-padding { padding-left:18px !important; padding-right:18px !important; }
      .footer-flex { display:block !important; }
      .mobile-center { text-align:center !important; }
      .cta-full { width:100% !important; display:block !important; }
    }
  </style>
</head>
<body style="background:#f3f5f7; font-family:Poppins, Arial, Helvetica, sans-serif; margin:0; padding:0;">
  <div class="preheader">${opts.preheader}</div>
  <center style="width:100%; padding:30px 0; background:#f3f5f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden;">

            <tr>
              <td style="padding:8px 32px; border-bottom:1px solid #edf0f2;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="left" class="mobile-center">
                      <img src="${b.logoHeader}" width="70" alt="Logo" style="max-width:70px; border-radius:4px; padding:10px;">
                    </td>
                    <td align="right" class="mobile-center" style="font-size:14px; font-weight:500; color:#585858;">${tagline}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="section-padding" style="padding:28px 32px;">
                <h1 style="margin:0 0 6px 0; font-size:24px; font-weight:600; color:#202124;">${opts.title}</h1>
                ${opts.bodyHtml}
                ${ctaBlock}
              </td>
            </tr>
            ${heroBlock}

            <tr>
              <td class="footer-padding" style="padding:20px 24px 24px 24px; border-top:1px solid #edf0f2;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr class="footer-flex">
                    <td>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td><img src="${b.logoFooter}" width="50" height="50" alt="Logo"></td>
                          <td style="padding-left:20px; font-size:13px; font-weight:500; color:#5f6368;">${b.name}</td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" class="mobile-center" style="font-size:11px; color:#80868b;">${companyAddress}</td>
                  </tr>
                </table>
                <table role="presentation" width="100%" style="margin-top:14px;">
                  <tr><td style="font-size:11px;">${footerLinks}</td></tr>
                </table>
                <p style="margin:10px 0 0 0; font-size:10px; color:#9aa0a6; line-height:1.6;">${footerNote}</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}
