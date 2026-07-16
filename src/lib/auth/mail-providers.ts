/**
 * Webmail shortcuts offered after signup, so "go check your email" is a click
 * rather than an instruction. Pure — unit-tested directly.
 */
export type MailProvider = { key: string; label: string; url: string; domains: string[] };

/** The four that cover almost every consumer signup we see. */
export const MAIL_PROVIDERS: readonly MailProvider[] = [
  {
    key: "gmail",
    label: "Gmail",
    url: "https://mail.google.com/mail/u/0/#search/from%3Anamaskar%40shubhamdatarkar.com+in%3Aanywhere",
    domains: ["gmail.com", "googlemail.com"],
  },
  {
    key: "outlook",
    label: "Outlook",
    url: "https://outlook.live.com/mail/0/",
    domains: ["outlook.com", "hotmail.com", "live.com", "msn.com"],
  },
  {
    key: "yahoo",
    label: "Yahoo",
    url: "https://mail.yahoo.com/",
    domains: ["yahoo.com", "yahoo.co.in", "ymail.com", "rocketmail.com"],
  },
  {
    key: "proton",
    label: "Proton",
    url: "https://mail.proton.me/u/0/all-mail",
    domains: ["proton.me", "protonmail.com", "pm.me"],
  },
] as const;

/**
 * The provider an address belongs to, or null for a work domain / anything else.
 * Used only to put the likely one first — every option still renders, because a
 * guess from the domain is a guess, not knowledge (plenty of custom domains sit
 * on Gmail).
 */
export function providerForEmail(email: string): MailProvider | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return null;
  return MAIL_PROVIDERS.find((p) => p.domains.includes(domain)) ?? null;
}

/** All four, likeliest first. */
export function orderedProviders(email: string): MailProvider[] {
  const match = providerForEmail(email);
  if (!match) return [...MAIL_PROVIDERS];
  return [match, ...MAIL_PROVIDERS.filter((p) => p.key !== match.key)];
}
