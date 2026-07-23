import { notFound } from "next/navigation";
import { getSupportProject } from "@/lib/data/support-content";
import { ProjectModal } from "@/components/projects/project-modal";

/**
 * Intercepts /projects/[slug] on client navigation and renders it as an
 * overlay. A hard load / refresh / shared link hits the real page instead.
 */
export default async function InterceptedProject({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getSupportProject(slug);
  if (!project) notFound();
  return (
    <ProjectModal
      project={{
        key: project.key,
        name: project.name,
        category: project.category,
        tagline: project.tagline,
        overview: project.overview,
      }}
    />
  );
}
