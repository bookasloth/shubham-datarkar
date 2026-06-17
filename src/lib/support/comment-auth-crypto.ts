/** Pure crypto for commenter verification. No server-only/next deps so vitest can run it. */
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export type CommenterIdentity = { email: string; name: string; iat: number };

function tokenSecret(): string {
  const s = process.env.COMMENTER_TOKEN_SECRET;
  if (!s) throw new Error("Missing COMMENTER_TOKEN_SECRET");
  return s;
}

function pepper(): string {
  return process.env.COMMENTER_OTP_PEPPER || tokenSecret();
}

function sign(payload: string): string {
  return createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
}

/** Sign an identity into a `payload.sig` token. */
export function signIdentity(id: CommenterIdentity): string {
  const payload = Buffer.from(JSON.stringify(id)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Verify + decode a token, or null if missing/tampered/malformed. */
export function verifyToken(token: string | undefined): CommenterIdentity | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as CommenterIdentity;
  } catch {
    return null;
  }
}

/** Hash an OTP with the server pepper for at-rest storage. */
export function hashOtp(code: string): string {
  return createHash("sha256").update(`${code}:${pepper()}`).digest("hex");
}

/** Email → supporter_key, matching support_lifetime: sha256(lower(trim(email))). */
export function emailKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
