import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { ComponentsGallery2 } from "@/components/showcase/components-gallery-2";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Component Library — Page 2",
  description:
    "Twenty more monochrome components and blocks — radio, slider, rating, OTP, dropzone, combobox, progress, pricing, carousel, sheet, and more.",
  ogTitle: "Twenty more components",
  ogDescription:
    "The next set — form controls, feedback, and composed blocks, built on the same monochrome motion language as Page 1.",
  path: "/components/page-2",
});

export default function ComponentsPage2() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Components", path: "/components" },
          { name: "Page 2", path: "/components/page-2" },
        ])}
      />
      <PageHero
        eyebrow="Design system · Page 2"
        title="Twenty more components"
        description="The next set — form controls, feedback, and composed blocks. All monochrome, accessible, and built on the same motion language as Page 1."
        crumbs={[{ label: "Home", href: "/" }, { label: "Components", href: "/components" }, { label: "Page 2" }]}
        actions={
          <Link href="/components" className={cn(buttonVariants({ variant: "outline" }))}>
            <ArrowLeft />
            Back to Page 1
          </Link>
        }
      />
      <Section>
        <Container>
          <ComponentsGallery2 />
        </Container>
      </Section>
    </>
  );
}
