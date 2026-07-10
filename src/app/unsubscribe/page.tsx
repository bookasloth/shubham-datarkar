import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/page-hero";
import { Container, Section } from "@/components/layout/container";
import { UnsubscribeForm } from "@/components/sections/unsubscribe-form";

export const metadata = buildMetadata({
  title: "Unsubscribe",
  description: "Unsubscribe from the Shubham Datarkar newsletter.",
  path: "/unsubscribe",
  noIndex: true,
});

export default function UnsubscribePage() {
  return (
    <>
      <PageHero
        eyebrow="Newsletter"
        title="Unsubscribe"
        description="Enter your email to stop receiving the newsletter. No hard feelings — you can come back anytime."
        crumbs={[{ label: "Home", href: "/" }, { label: "Unsubscribe" }]}
      />
      <Section>
        <Container size="narrow">
          <UnsubscribeForm />
        </Container>
      </Section>
    </>
  );
}
