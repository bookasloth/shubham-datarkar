import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Coffee } from "lucide-react";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { personRef } from "@/lib/seo/entities";
import { supportProjects, getSupportProject } from "@/lib/data/support-content";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

// Prerender every known project; unknown slugs 404.
export function generateStaticParams() {
  return supportProjects.map((p) => ({ slug: p.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getSupportProject(slug);
  if (!project) return buildMetadata({ title: "Project", path: `/projects/${slug}`, noIndex: true });
  return buildMetadata({
    title: `${project.name} — ${project.category}`,
    description: `${project.tagline} ${project.overview[0]}`.slice(0, 200),
    ogTitle: project.name,
    ogDescription: project.tagline,
    path: `/projects/${project.key}`,
    type: "article",
  });
}

// CreativeWork for the project, created by the Person entity. `sameAs` links a
// live product to its own domain so answer engines resolve it as a real thing.
function projectSchema(project: NonNullable<ReturnType<typeof getSupportProject>>) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    headline: `${project.name} — ${project.category}`,
    description: project.tagline,
    creativeWorkStatus: project.status === "live" ? "Published" : "In development",
    creator: personRef,
    ...(project.url ? { url: project.url, sameAs: project.url } : {}),
    mainEntityOfPage: `${site.url}/projects/${project.key}`,
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getSupportProject(slug);
  if (!project) notFound();

  const isLive = project.status === "live";

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Projects", path: "/projects" },
          { name: project.name, path: `/projects/${project.key}` },
        ])}
      />
      <JsonLd data={projectSchema(project)} />

      <PageHero
        eyebrow={project.category}
        title={project.name}
        description={project.tagline}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: project.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {isLive && project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants())}
              >
                Visit {project.name}
                <ArrowUpRight className="size-4" />
              </a>
            )}
            <Link
              href={`/support?p=${project.key}`}
              className={cn(buttonVariants({ variant: isLive ? "outline" : "default" }))}
            >
              <Coffee className="size-4" />
              Support this
            </Link>
          </div>
        }
      />

      <Section>
        <Container size="narrow">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{project.category}</Badge>
            <Badge variant={isLive ? "success" : "outline"}>{isLive ? "Live" : "Building"}</Badge>
            <span className="text-sm text-muted-foreground">{project.role}</span>
          </div>

          <div className="mt-8 flex flex-col gap-5">
            {project.overview.map((para) => (
              <p key={para.slice(0, 24)} className="text-[17px] leading-8 text-foreground/90">
                {para}
              </p>
            ))}
          </div>

          <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {isLive ? "What it does" : "What it's built to do"}
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {project.did.map((item) => (
                <li key={item} className="flex gap-3 text-[17px] leading-8 text-foreground/90">
                  <span className="mt-3 size-1.5 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 flex flex-col items-start gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-semibold">
              {isLive ? "Like what you see?" : "Want to see this ship?"}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/support?p=${project.key}`} className={cn(buttonVariants())}>
                <Coffee className="size-4" />
                Support this project
              </Link>
              <Link href="/projects" className={cn(buttonVariants({ variant: "outline" }))}>
                <ArrowLeft className="size-4" />
                All projects
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
