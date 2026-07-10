type JsonLdData = Record<string, unknown> | Record<string, unknown>[];

/**
 * Serialize schema data for inlining inside a `<script>` element.
 *
 * Part of the payload comes from the database (testimonial quotes, for
 * instance), so it is not author-controlled. `JSON.stringify` leaves `<`
 * as-is, and a value containing `</script>` would close the element early and
 * let whatever follows parse as HTML. A JSON string may encode `<` as the
 * escape sequence backslash-u-003c, which consumers decode back to `<`, so
 * this keeps the payload semantically identical while making `</script>`
 * unrepresentable in the output.
 */
export function serializeJsonLd(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Server-rendered JSON-LD. Injecting structured data server-side keeps it in
 * the initial HTML for fast crawler parsing (no client hydration needed).
 */
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
  );
}
