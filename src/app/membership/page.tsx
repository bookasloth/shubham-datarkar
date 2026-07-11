import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "Join the Community",
  description:
    "A community for builders and marketers who ship. Details coming soon.",
  path: "/membership",
});

// ponytail: placeholder shell — real membership experience designed later.
export default function MembershipPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Community", path: "/membership" },
        ])}
      />
      <PageHero
        eyebrow="Community"
        title="Join the Community"
        description="A space for builders and marketers who ship. Details are coming soon — check back shortly."
        crumbs={[{ label: "Home", href: "/" }, { label: "Community" }]}
      />
      <Section>
        <Container>
          <p className="text-muted-foreground">More on this soon.</p>
        </Container>
      </Section>
    </>
  );
}
