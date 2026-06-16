import * as React from "react";
import { Container } from "@/components/layout/container";

export type LegalBlock = {
  heading: string;
  paras?: React.ReactNode[];
  list?: React.ReactNode[];
};

/** Shared layout for long-form legal/policy pages. */
export function LegalDoc({ updated, blocks }: { updated: string; blocks: LegalBlock[] }) {
  return (
    <Container size="prose">
      <p className="text-sm text-muted-foreground">Last updated: {updated}</p>
      <div className="mt-8 flex flex-col gap-8">
        {blocks.map((b) => (
          <section key={b.heading}>
            <h2 className="text-xl font-bold tracking-tight">{b.heading}</h2>
            {b.paras?.map((p, i) => (
              <p key={i} className="mt-3 leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {b.list && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
                {b.list.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Container>
  );
}
