import type { ReactNode } from "react";
import { Container, Section } from "@/components/layout/container";
import { ProfileCard } from "@/components/support/profile-card";
import { SupportNav } from "@/components/support/support-nav";

/** Shared frame: persistent profile sidebar + page sub-nav across all three routes. */
export default function SupportLayout({ children }: { children: ReactNode }) {
  return (
    <Section>
      <Container>
        <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-[26px]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ProfileCard />
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
