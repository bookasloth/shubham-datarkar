import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { site } from "@/lib/site";
import { supportProjects } from "@/lib/data/support-content";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { CtaBand } from "@/components/sections/cta-band";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "Projects",
  description:
    "The products, platforms, and communities I'm building — from a live booking SaaS and an alumni network to a Community OS, a marketing publication, and more. Some live, some in progress.",
  ogTitle: "Projects I'm building",
  ogDescription: "Products, platforms, and communities — some live, some in progress. Booking SaaS, alumni networks, a Community OS, and more.",
  path: "/projects",
});

// ItemList feeds answer engines a clean, citable list of projects — "what is
// Shubham Datarkar building" resolves to these, in order.
function projectsItemList() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Projects by Shubham Datarkar",
    itemListElement: supportProjects.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${site.url}/projects/${p.key}`,
      name: p.name,
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
        eyebrow="Projects"
        title="What I'm building"
        description="The products, platforms, and communities taking shape right now. Some are live and in your hands; others are still being built in the open."
        crumbs={[{ label: "Home", href: "/" }, { label: "Projects" }]}
      />
      <Section>
        <Container>
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {supportProjects.map((project) => (
              <StaggerItem key={project.key}>
                <Link href={`/projects/${project.key}`} className="group block h-full">
                  <Card interactive className="flex h-full flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant="muted">{project.category}</Badge>
                      <Badge variant={project.status === "live" ? "success" : "outline"}>
                        {project.status === "live" ? "Live" : "Building"}
                      </Badge>
                    </div>
                    <h2 className="mt-4 flex items-center gap-1 text-lg font-semibold tracking-tight">
                      {project.name}
                      <ArrowUpRight className="size-4 text-muted-foreground transition-ui group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{project.tagline}</p>
                    <span className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {project.role}
                    </span>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
