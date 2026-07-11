import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "In Progress",
  description: "What I'm building right now — works in progress. Details coming soon.",
  path: "/projects",
});

// ponytail: placeholder shell — real WIP projects list designed later.
export default function ProjectsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "In Progress", path: "/projects" },
        ])}
      />
      <PageHero
        eyebrow="In Progress"
        title="What I'm building"
        description="Works in progress — the things taking shape right now. Details are coming soon, check back shortly."
        crumbs={[{ label: "Home", href: "/" }, { label: "In Progress" }]}
      />
      <Section>
        <Container>
          <p className="text-muted-foreground">More on this soon.</p>
        </Container>
      </Section>
    </>
  );
}
