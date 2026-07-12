import { createHmac, timingSafeEqual } from "node:crypto";

/** Constant-time verify of GitHub's X-Hub-Signature-256 header. */
export function verifyGithubSignature(secret: string, payload: string, header: string | null): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}
