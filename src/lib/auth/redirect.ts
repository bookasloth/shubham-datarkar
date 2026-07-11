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
