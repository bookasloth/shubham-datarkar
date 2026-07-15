/** Absolute URL to the /auth/confirm route that verifies an emailed token_hash. */
export function buildConfirmUrl(origin: string, tokenHash: string, type: string, next?: string): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type });
  if (next) params.set("next", next);
  return `${origin}/auth/confirm?${params.toString()}`;
}
