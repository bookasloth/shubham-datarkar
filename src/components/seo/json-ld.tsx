/**
 * Server-rendered JSON-LD. Injecting structured data server-side keeps it in
 * the initial HTML for fast crawler parsing (no client hydration needed).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Data is author-controlled (no user input), safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
