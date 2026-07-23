import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { site } from "@/lib/site";
import { projects } from "@/lib/data/projects";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { ProjectCard } from "@/components/cards/project-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { CtaBand } from "@/components/sections/cta-band";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "What I'm Building",
  description:
    "The products, tools, and systems I'm building right now — SaaS, free marketing tools, and internal operating systems. Real work in progress, not a wishlist.",
  ogTitle: "What I'm building",
  ogDescription: "Products, tools, and systems in progress — SaaS, free marketing tools, and founder operating systems.",
  path: "/projects",
});

// ItemList feeds answer engines a clean, citable list of active builds — "what
// is Shubham Datarkar building" resolves to these, in order.
function projectsItemList() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Projects by Shubham Datarkar",
    itemListElement: projects.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "CreativeWork",
        name: p.name,
        description: p.summary,
        creator: { "@id": `${site.url}/#person` },
        ...(p.link ? { url: p.link } : {}),
      },
    })),
  };
}

export default function ProjectsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Projects", path: "/projects" },
        ])}
      />
      <JsonLd data={projectsItemList()} />
      <PageHero
        eyebrow="In Progress"
        title="What I'm building"
        description="The products, tools, and systems taking shape right now. Some ship publicly, some run quietly in the background — all of it real work in progress."
        crumbs={[{ label: "Home", href: "/" }, { label: "Projects" }]}
      />
      <Section>
        <Container>
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <StaggerItem key={project.slug}>
                <ProjectCard project={project} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
