import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { supportProjects, getSupportProject } from "@/lib/data/support-content";

// Prerender every known project; unknown slugs 404.
export function generateStaticParams() {
  return supportProjects.map((p) => ({ slug: p.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getSupportProject(slug);
  if (!project) return buildMetadata({ title: "Project", path: `/projects/${slug}`, noIndex: true });
  // ponytail: thin "coming soon" stub — noindex until a real page exists so it
  // doesn't dilute crawl quality. Still reachable from /support.
  return buildMetadata({
    title: `${project.name} — Coming soon`,
    description: `${project.name} — details coming soon.`,
    path: `/projects/${project.key}`,
    noIndex: true,
  });
}

// ponytail: shared coming-soon shell for every project until real pages exist.
export default async function ProjectComingSoonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getSupportProject(slug);
  if (!project) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "In Progress", path: "/projects" },
          { name: project.name, path: `/projects/${project.key}` },
        ])}
      />
      <PageHero
        eyebrow="Coming soon"
        title={project.name}
        description="This project's page is on the way. Details are coming soon — check back shortly."
        crumbs={[{ label: "Home", href: "/" }, { label: "In Progress", href: "/projects" }, { label: project.name }]}
      />
      <Section>
        <Container>
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-ui hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to all projects
          </Link>
        </Container>
      </Section>
    </>
  );
}
