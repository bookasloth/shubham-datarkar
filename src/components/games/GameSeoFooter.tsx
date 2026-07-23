import { videoGameSchema } from "@/lib/seo";
import { gameSeo } from "@/lib/games/seo";
import { JsonLd } from "@/components/seo/json-ld";

/**
 * Indexable About + FAQ block rendered under a game board, plus the game's
 * VideoGame schema. Gives each daily game real content to rank on (positioned
 * against its analog) without touching the interactive board itself.
 */
export function GameSeoFooter({ slug }: { slug: string }) {
  const seo = gameSeo[slug];
  if (!seo) return null;
  return (
    <section className="mx-auto mt-12 max-w-2xl border-t border-border pt-8">
      <JsonLd
        data={videoGameSchema({
          name: seo.title.split(" — ")[0],
          description: seo.description,
          path: `/games/${slug}`,
          genre: seo.genre,
          sameAs: seo.sameAs,
        })}
      />
      <div className="flex flex-col gap-4">
        {seo.about.map((p) => (
          <p key={p.slice(0, 24)} className="text-[15px] leading-7 text-muted-foreground">
            {p}
          </p>
        ))}
      </div>
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">FAQ</h2>
      <dl className="mt-4 flex flex-col">
        {seo.faq.map((f) => (
          <div key={f.question} className="border-b border-border py-4 first:pt-0 last:border-b-0">
            <dt className="text-sm font-semibold tracking-tight">{f.question}</dt>
            <dd className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
