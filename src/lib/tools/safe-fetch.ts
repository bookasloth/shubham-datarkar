import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { isPrivateIp } from "./ip";

/**
 * SSRF-safe HTML fetch for the public SEO-audit tool. Users supply the URL, so
 * this is a trust boundary: we validate the scheme, block internal hostnames,
 * resolve DNS and reject any private/reserved IP (defeats "point a public
 * domain at 169.254.169.254 / 10.x / localhost" attacks), re-validate every
 * redirect hop, and cap time + size. Anything off-policy throws AuditError with
 * a safe, user-facing message — internal details never leak.
 */
export class AuditError extends Error {}

const TIMEOUT_MS = 9000;
const MAX_BYTES = 4_000_000; // 4 MB of HTML is plenty for an audit
const MAX_REDIRECTS = 4;

async function assertPublicHost(host: string): Promise<void> {
  const h = host.toLowerCase();
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) {
    throw new AuditError("That host isn't allowed.");
  }
  // If the host is already a literal IP, check it directly.
  if (net.isIP(h)) {
    if (isPrivateIp(h)) throw new AuditError("That address isn't allowed.");
    return;
  }
  let addrs: { address: string }[];
  try {
    addrs = await lookup(h, { all: true });
  } catch {
    throw new AuditError("Couldn't resolve that domain.");
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new AuditError("That host resolves to a private address, so it can't be audited.");
  }
}

function parseTarget(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    // let a bare domain through by assuming https
    try {
      url = new URL(`https://${raw.trim()}`);
    } catch {
      throw new AuditError("Enter a valid URL, e.g. https://example.com.");
    }
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AuditError("Only http and https URLs can be audited.");
  }
  return url;
}

async function readCapped(res: Response): Promise<string> {
  const len = Number(res.headers.get("content-length") ?? "0");
  if (len && len > MAX_BYTES) throw new AuditError("That page is too large to audit.");
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new AuditError("That page is too large to audit.");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

/**
 * Fetch a URL's HTML with SSRF protection. Returns the final URL (after
 * redirects) and the HTML body. Throws AuditError on any policy violation.
 */
export async function safeFetchHtml(raw: string): Promise<{ finalUrl: string; html: string }> {
  let url = parseTarget(raw);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        redirect: "manual", // re-validate every hop ourselves
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ShubhamDatarkarSEOAudit/1.0; +https://shubhamdatarkar.com/tools/seo-audit)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      throw new AuditError("Couldn't reach that page — it may be down or blocking automated requests.");
    } finally {
      clearTimeout(timer);
    }

    // Follow redirects manually so each new host is re-validated.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new AuditError("That page returned a redirect with no destination.");
      if (hop === MAX_REDIRECTS) throw new AuditError("That page redirects too many times.");
      url = new URL(loc, url); // resolve relative redirects
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new AuditError("That page redirects somewhere unsupported.");
      continue;
    }

    if (!res.ok) throw new AuditError(`That page returned HTTP ${res.status}.`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) throw new AuditError("That URL doesn't return an HTML page.");

    const html = await readCapped(res);
    return { finalUrl: url.toString(), html };
  }
  throw new AuditError("That page redirects too many times.");
}
