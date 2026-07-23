import type { ReactNode } from "react";
import { Container, Section } from "@/components/layout/container";
import { ProfileCard } from "@/components/support/profile-card";
import { SupportNav } from "@/components/support/support-nav";
import { getSupportStats } from "@/lib/support/queries";

// Supporter counts change slowly — ISR keeps /support + /support/supporters on
// the CDN (fast TTFB for an indexable conversion page) and refreshes every 5 min.
// ponytail: was force-dynamic; 5-min staleness on a coffee counter is fine.
export const revalidate = 300;

/** Shared frame: persistent profile sidebar + page sub-nav across all three routes. */
export default async function SupportLayout({ children }: { children: ReactNode }) {
  const stats = await getSupportStats();
  return (
    <Section className="pt-8 md:pt-10">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-[26px]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ProfileCard supporterCount={stats.supporters} />
          </aside>
          <div className="min-w-0">
            <SupportNav />
            <div className="pt-8">{children}</div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
