/** Humanize a thread slug for display: "sign-in-wall" → "Sign-in wall".
 *  Shared by the thread page header and the engagement-bar thread icon. */
export function humanizeThread(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
