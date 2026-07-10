import { BrandIcon } from "@/components/ui/brand-icon";
import { site, companies } from "@/lib/site";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Press & Media Kit",
  description:
    "Bios, brand assets, logos, headshots, and press contact for Shubham Datarkar, The Kalamwala. Everything press needs, copy-paste ready.",
  ogTitle: "Everything press needs",
  ogDescription:
    "Copy-paste bios, logos, headshots, and a fast way to reach me. Attribution appreciated — assets on request.",
  path: "/media-kit",
});

const facts = [
  { k: "Name", v: site.name },
  { k: "Alias", v: site.alias },
  { k: "Role", v: "Founder, Marketer & Builder" },
  { k: "Based in", v: site.location },
  { k: "Companies", v: companies.map((c) => c.name).join(" · ") },
  { k: "Focus", v: "Marketing × Product × AI" },
];

const bios = {
  short: "Shubham Datarkar (The Kalamwala) is a copywriter, marketer, and builder — CMO at Book A Sloth and founder of Timewheel Internet.",
  medium:
    "Shubham Datarkar, known as The Kalamwala, is a Nagpur-based copywriter, marketer, and builder. He is the CMO of Book A Sloth, founder & CEO of Timewheel Internet, and makes ads and software through The Bogus Company. His craft spans copywriting, SEO, content marketing, and full-stack development.",
  long: "Shubham N Datarkar — The Kalamwala — is an Indian copywriter, marketer, and builder based in Nagpur. Over nearly a decade he has written for brands big and small — including an IPL 2021 animation TVC for Disney+ Hotstar — and grown into marketing leadership. Today he is CMO at Book A Sloth (the operating system for India's booking economy), founder & CEO of Timewheel Internet, and the maker behind The Bogus Company. He builds things that make other things easier — ads, brands, and entire software — guided by one idea: automation should feel human, and creativity should be measurable.",
};

export default function MediaKitPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Media Kit", path: "/media-kit" }])} />
      <PageHero
        eyebrow="Media kit"
        title="Everything press needs"
        description="Bios, brand assets, and a fast way to reach me. Use any of the below freely — attribution appreciated."
        crumbs={[{ label: "Home", href: "/" }, { label: "Media Kit" }]}
        actions={
          <a href={`mailto:${site.email}`} className={cn(buttonVariants({ size: "lg" }))}>
            <BrandIcon name="Mail" />
            Email for assets
          </a>
        }
      />

      <Section>
        <Container>
          <SectionHeading eyebrow="Quick facts" title="The essentials" />
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-3">
            {facts.map((f) => (
              <div key={f.k} className="bg-card p-5">
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{f.k}</dt>
                <dd className="mt-1 text-sm font-medium">{f.v}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      <Section bleed className="border-y border-border bg-card py-16 md:py-24">
        <Container>
          <SectionHeading eyebrow="Bios" title="Copy-paste ready" />
          <div className="mt-8 flex flex-col gap-4">
            {(["short", "medium", "long"] as const).map((key) => (
              <Card key={key} className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{key} bio</h3>
                  <CopyButton value={bios[key]} />
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{bios[key]}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading eyebrow="Brand" title="Logo & headshots" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Card className="flex items-center justify-center bg-background p-12">
              <Logo />
            </Card>
            <Card className="flex items-center justify-center bg-foreground p-12">
              <div className="[&_*]:!text-background">
                <Logo href={null} />
              </div>
            </Card>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="flex aspect-square items-center justify-center rounded-img border border-border bg-muted text-sm text-muted-foreground"
              >
                Headshot 0{n}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section bleed className="border-t border-border bg-card py-16">
        <Container>
          <Card className="flex flex-col items-start justify-between gap-4 p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Press & media enquiries</h2>
              <p className="mt-1 text-sm text-muted-foreground">{site.email}</p>
            </div>
            <div className="flex gap-2">
              <CopyButton value={site.email} label="Copy email" />
              <a href={`mailto:${site.email}`} className={cn(buttonVariants())}>
                <BrandIcon name="Mail" />
                Email me
              </a>
            </div>
          </Card>
        </Container>
      </Section>
    </>
  );
}
