import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { resources } from "@/lib/data/site-content";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Resources",
  description: "Frameworks, templates, checklists, and guides — the systems behind the work, free to use.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }])} />
      <PageHero
        eyebrow="Resources"
        title="Frameworks & templates"
        description="The actual systems I use in production — packaged so you can use them too. Free, in exchange for an email."
        crumbs={[{ label: "Home", href: "/" }, { label: "Resources" }]}
      />
      <Section>
        <Container>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <StaggerItem key={r.slug}>
                <Card className="flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <Badge variant="muted">{r.type}</Badge>
                    <span className="text-xs text-muted-foreground">{r.format}</span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight">{r.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{r.description}</p>
                  <Link
                    href="/newsletter"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-5 w-fit")}
                  >
                    <Download />
                    Get it free
                  </Link>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-12 rounded-card border border-border bg-card p-8 text-center">
            <h2 className="text-xl font-bold tracking-tight">Want these as they ship?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              New frameworks and templates land in the newsletter first.
            </p>
            <Link href="/newsletter" className={cn(buttonVariants(), "mt-5")}>
              Join the newsletter
              <ArrowRight />
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
