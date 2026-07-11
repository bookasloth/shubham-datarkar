/**
 * Where a signed-in user lands after auth: the single admin to the console,
 * everyone else to their member workspace. Non-admins have no place in /admin —
 * requireAdmin would bounce them back to /login. Strict email match mirrors
 * getAdminUser so this never disagrees with the gate.
 */
export function postLoginPath(email: string | null | undefined): string {
  return !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL
    ? "/admin"
    : "/members";
}

/** Authed subtrees a post-login `next` may return to. Anything else is dropped. */
const NEXT_ALLOWED = ["/admin", "/members", "/games", "/community", "/tools/kalamai"];

/**
 * Validate a `next` return path. Returns the path only if it points at one of
 * the app's own authed subtrees; otherwise null. Rejects absolute URLs,
 * protocol-relative (`//host`, `/\host`), and unknown paths — this is the open
 * redirect boundary, so it fails closed.
 */
export function safeNext(raw: string | null | undefined): string | null {
  const v = String(raw ?? "");
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  return NEXT_ALLOWED.some(
    (p) => v === p || v.startsWith(`${p}/`) || v.startsWith(`${p}?`),
  )
    ? v
    : null;
}

/** Post-login destination: an explicit safe `next`, else the identity default. */
export function loginDestination(
  next: string | null | undefined,
  email: string | null | undefined,
): string {
  return safeNext(next) ?? postLoginPath(email);
}
