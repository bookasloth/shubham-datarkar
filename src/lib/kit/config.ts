/**
 * Kit (ConvertKit) configuration — types, API base, and the field metadata
 * that drives the admin Integrations form. Pure constants (no server-only
 * deps) so the client form can import labels/help text.
 */

export type KitCredentials = {
  apiKey: string;
  formId: string;
};

/** Kit v4 API base. Auth via the `X-Kit-Api-Key` header. */
export const KIT_API_BASE = "https://api.kit.com/v4";

export type KitFieldKey = keyof KitCredentials;

export const KIT_FIELDS: {
  key: KitFieldKey;
  label: string;
  secret: boolean;
  help: string;
}[] = [
  {
    key: "apiKey",
    label: "API Key",
    secret: true,
    help: "Kit → Settings → Advanced → API → your V4 API Key (sent as X-Kit-Api-Key).",
  },
  {
    key: "formId",
    label: "Form ID",
    secret: false,
    help: "Kit → Grow → Forms → open the form → the numeric ID in the URL. New subscribers are added to this form.",
  },
];
