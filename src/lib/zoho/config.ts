/**
 * Zoho Payments configuration — types, environment bases, and the field
 * metadata that drives the admin Integrations form.
 *
 * Pure constants only (no server-only deps) so the form (client component)
 * can import the labels/help text without pulling in secrets.
 */

export type ZohoMode = "sandbox" | "live";

export type ZohoCredentials = {
  mode: ZohoMode;
  accountId: string;
  apiKey: string;
  oauthClientId: string;
  oauthClientSecret: string;
  refreshToken: string;
  webhookSecret: string;
};

/** OAuth token endpoint host (India DC — same host for sandbox + live). */
export const ZOHO_ACCOUNTS_BASE = "https://accounts.zoho.in";

/** Payments API base differs by mode. */
export function zohoPaymentsBase(mode: ZohoMode): string {
  return mode === "live"
    ? "https://payments.zoho.in"
    : "https://paymentssandbox.zoho.in";
}

export type ZohoFieldKey = Exclude<keyof ZohoCredentials, "mode">;

/** Drives the admin form: order, labels, secret-masking, and where-to-find help. */
export const ZOHO_FIELDS: {
  key: ZohoFieldKey;
  label: string;
  secret: boolean;
  help: string;
}[] = [
  {
    key: "accountId",
    label: "Account ID",
    secret: false,
    help: "Zoho Payments dashboard → Settings → Developer Space.",
  },
  {
    key: "apiKey",
    label: "API Key",
    secret: false,
    help: "Zoho Payments → Settings → Developer Space → API Keys (used by the checkout widget).",
  },
  {
    key: "oauthClientId",
    label: "OAuth Client ID",
    secret: false,
    help: "Zoho API Console (api-console.zoho.in) → your Self Client app.",
  },
  {
    key: "oauthClientSecret",
    label: "OAuth Client Secret",
    secret: true,
    help: "Zoho API Console → your Self Client app (next to the Client ID).",
  },
  {
    key: "refreshToken",
    label: "OAuth Refresh Token",
    secret: true,
    help: "Generated once by exchanging a grant token (scope ZohoPaySandbox.* for sandbox, ZohoPay.* for live).",
  },
  {
    key: "webhookSecret",
    label: "Webhook Secret",
    secret: true,
    help: "Zoho Payments → Settings → Webhooks → signing secret for /api/support/webhook.",
  },
];
