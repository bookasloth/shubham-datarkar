import { renderEmail, emailDetails } from "../template";
import { type RenderedEmail, esc, p, TXN_FOOTER } from "./_shared";

const SITE = "https://shubhamdatarkar.com";

/**
 * The full SEO + AI-visibility audit report, emailed after the visitor unlocks
 * it (spec §29). Scores + biggest opportunities + top findings inline, then a
 * CTA into the paid visibility service. All content is LLM/crawl-derived, so
 * every interpolated value is escaped before entering the trusted body.
 */
export function seoAuditReport(a: {
  domain: string;
  seo: number;
  ai: number;
  overall: number;
  opportunitySummary?: string;
  opportunities: { title: string; summary: string }[];
  findings: { title: string; recommendation: string }[];
}): RenderedEmail {
  const list = (items: string[]) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
    items
      .map(
        (html) =>
          `<tr><td style="padding:0 0 12px; font-size:14px; color:#2d2d2d; line-height:1.6;">${html}</td></tr>`,
      )
      .join("") +
    `</table>`;

  const opportunityItems = a.opportunities
    .slice(0, 5)
    .map((o, i) => `<strong>${i + 1}. ${esc(o.title)}</strong><br>${esc(o.summary)}`);
  const findingItems = a.findings
    .slice(0, 6)
    .map((f) => `<strong>${esc(f.title)}</strong><br>${esc(f.recommendation)}`);

  const bodyHtml =
    p(`Here's your full SEO + AI-visibility audit for <strong>${esc(a.domain)}</strong>.`) +
    emailDetails([
      { label: "Overall visibility", value: `${a.overall} / 100` },
      { label: "SEO score", value: `${a.seo} / 100` },
      { label: "AI Visibility score", value: `${a.ai} / 100` },
    ]) +
    (a.opportunitySummary
      ? `<p style="margin:20px 0 8px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6b6b6b;">Your biggest opportunity</p>` +
        p(esc(a.opportunitySummary))
      : "") +
    (opportunityItems.length
      ? `<p style="margin:20px 0 8px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6b6b6b;">What we'd fix first</p>` +
        list(opportunityItems)
      : "") +
    (findingItems.length
      ? `<p style="margin:20px 0 8px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6b6b6b;">Top findings</p>` +
        list(findingItems)
      : "") +
    p("Want help turning this into consistent visibility across Google and AI answers? Reply to this email or book a time below.");

  return {
    subject: `Your SEO + AI visibility audit for ${a.domain}`,
    html: renderEmail({
      preheader: `Overall ${a.overall}/100 · SEO ${a.seo} · AI Visibility ${a.ai}. Here's what to fix first.`,
      headerTagline: "Your visibility audit",
      title: "Your SEO + AI visibility report",
      bodyHtml,
      cta: { label: "Talk about your AI visibility", href: `${SITE}/contact?ref=seo-audit` },
      footerNote: TXN_FOOTER,
    }),
    text:
      `Your SEO + AI visibility audit for ${a.domain}\n\n` +
      `Overall ${a.overall}/100 · SEO ${a.seo}/100 · AI Visibility ${a.ai}/100\n\n` +
      (a.opportunitySummary ? `Biggest opportunity: ${a.opportunitySummary}\n\n` : "") +
      (opportunityItems.length ? `What we'd fix first:\n` + a.opportunities.slice(0, 5).map((o, i) => `${i + 1}. ${o.title} — ${o.summary}`).join("\n") + "\n\n" : "") +
      `Talk about your AI visibility: ${SITE}/contact?ref=seo-audit`,
  };
}
