import sanitizeHtml from "sanitize-html";

/** Derive the IMAP host from the stored SMTP host (smtp.x -> imap.x). */
export function imapHostFromSmtp(host: string): string {
  return host.startsWith("smtp.") ? "imap." + host.slice("smtp.".length) : host;
}

/** "Re:" prefix without doubling it. */
export function buildReplySubject(subject: string): string {
  const s = (subject ?? "").trim();
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

/** RFC 5322 References header: prior References followed by the parent Message-ID. */
export function buildReferences(
  references: string | undefined,
  messageId: string | undefined,
): string {
  return [references?.trim(), messageId?.trim()].filter(Boolean).join(" ");
}

/** Escape the five HTML-significant characters for plain-text reply bodies. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const REMOTE_IMG = /^https?:\/\//i;

/**
 * Sanitize an email HTML body for safe render. Strips scripts, event handlers,
 * iframes, etc. (anything not in the allow-list). Remote images are blocked by
 * default (open-tracking defense) — their url is stashed in data-blocked-src so
 * the UI can offer a "load images" toggle.
 */
export function sanitizeEmailHtml(html: string, allowRemoteImages = false): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["style", "align"],
      img: ["src", "alt", "width", "height", "style", "data-blocked-src"],
      a: ["href", "name", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
      img: (tagName, attribs) => {
        if (!allowRemoteImages && attribs.src && REMOTE_IMG.test(attribs.src)) {
          const { src, ...rest } = attribs;
          return { tagName, attribs: { ...rest, "data-blocked-src": src } };
        }
        return { tagName, attribs };
      },
    },
  });
}
