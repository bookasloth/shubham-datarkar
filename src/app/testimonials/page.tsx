import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { testimonials } from "@/lib/data/testimonials";
import { stats } from "@/lib/data/site-content";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { StatGrid } from "@/components/sections/stat-grid";
import { CtaBand } from "@/components/sections/cta-band";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { TestimonialCard } from "@/components/cards/testimonial-card";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "Testimonials",
  description: "What founders and teams say about working with Shubham Datarkar.",
  path: "/testimonials",
});

export default function TestimonialsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Testimonials", path: "/testimonials" }])} />
      <PageHero
        eyebrow="Testimonials"
        title="In their words"
        description="Outcome-specific feedback from the founders and teams I've worked with. No generic praise."
        crumbs={[{ label: "Home", href: "/" }, { label: "Testimonials" }]}
      />
      <Section>
        <Container>
          <Stagger className="columns-1 gap-4 md:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {testimonials.map((t) => (
              <StaggerItem key={t.name}>
                <TestimonialCard testimonial={t} />
              </StaggerItem>
            ))}
          </Stagger>
          <div className="mt-12">
            <StatGrid stats={stats} />
          </div>
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
