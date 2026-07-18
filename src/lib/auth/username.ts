/**
 * Mirror of the DB rule in set_username (supabase migration). Returns an error
 * string, or null if OK. Pure + synchronous and framework-agnostic on purpose:
 * both the server action and the client wizard import it, so it must NOT live in
 * a "use server" module (whose exports become async RPC proxies on the client).
 */
export function validateUsername(raw: string): string | null {
  const v = raw.trim();
  if (!/^[a-zA-Z0-9_.]{3,30}$/.test(v)) {
    return "Username must be 3-30 chars: letters, numbers, dot, underscore.";
  }
  return null;
}
