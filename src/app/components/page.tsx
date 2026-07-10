import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { ComponentsGallery } from "@/components/showcase/components-gallery";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Design System Components",
  description:
    "The internal design system behind this site — 40+ monochrome, accessible components and composed blocks, all live in a single gallery.",
  ogTitle: "The component library",
  ogDescription:
    "40+ monochrome, accessible components and composed blocks — the design system behind the site, all live.",
  path: "/components",
});

export default function ComponentsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Components", path: "/components" }])} />
      <PageHero
        eyebrow="Design system"
        title="The component library"
        description="Every building block of this site, in one place. Monochrome, accessible, and built on one shared motion language. 40+ live components and blocks."
        crumbs={[{ label: "Home", href: "/" }, { label: "Components" }]}
      />
      <Section>
        <Container>
          <ComponentsGallery />
          <div className="mt-16 flex flex-col items-center justify-between gap-4 rounded-card border border-border bg-card p-8 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">There&apos;s more</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                20 additional components — radio, slider, rating, OTP, dropzone, pricing, carousel, and more.
              </p>
            </div>
            <Link href="/components/page-2" className={cn(buttonVariants({ size: "lg" }))}>
              Components — Page 2
              <ArrowRight />
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
