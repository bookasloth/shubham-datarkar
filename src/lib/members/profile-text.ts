/** Trim → empty-to-null → length cap. Shared by the profile edit server action
 *  and (client-side) the edit form, so both agree on limits. */
export const HEADLINE_MAX = 120;
export const BIO_MAX = 500;

function clean(value: string | null | undefined, max: number): string | null {
  const t = (value ?? "").trim();
  if (!t) return null;
  return t.slice(0, max);
}

export function normalizeProfileText(input: { headline?: string | null; bio?: string | null }): {
  headline: string | null;
  bio: string | null;
} {
  return {
    headline: clean(input.headline, HEADLINE_MAX),
    bio: clean(input.bio, BIO_MAX),
  };
}
