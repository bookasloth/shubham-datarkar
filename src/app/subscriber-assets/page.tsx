import Link from "next/link";
import { FileText, LayoutTemplate, PenLine, Hammer } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/page-hero";
import { Container, Section } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export const metadata = buildMetadata({
  title: "Subscriber Assets",
  description: "Exclusive frameworks, templates, and resources for newsletter subscribers.",
  path: "/subscriber-assets",
  noIndex: true,
});

const ASSETS = [
  {
    icon: LayoutTemplate,
    title: "Growth frameworks",
    blurb: "The SEO and performance systems I run for clients, written up as repeatable playbooks.",
  },
  {
    icon: FileText,
    title: "Templates",
    blurb: "Briefs, audit sheets, and reporting templates you can copy and use today.",
  },
  {
    icon: PenLine,
    title: "Swipe files",
    blurb: "Ads, hooks, and copy that worked — with notes on why they worked.",
  },
  {
    icon: Hammer,
    title: "Build logs",
    blurb: "Behind-the-scenes notes from my ventures and experiments.",
  },
];

export default function SubscriberAssetsPage() {
  return (
    <>
      <PageHero
        eyebrow="Subscriber only"
        title="Exclusive goodies"
        description="Resources I don't share anywhere else. New drops go out through the newsletter — subscribe to get them first."
        crumbs={[{ label: "Home", href: "/" }, { label: "Subscriber Assets" }]}
      />
      <Section>
        <Container size="narrow">
          <div className="grid gap-4 sm:grid-cols-2">
            {ASSETS.map((a) => (
              <div key={a.title} className="rounded-card border border-border p-5">
                <a.icon className="size-5 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">{a.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{a.blurb}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 rounded-card border border-border p-6">
            <p className="text-sm text-muted-foreground">
              Not subscribed yet? Join to unlock new assets as they drop.
            </p>
            <Button asChild size="sm">
              <Link href="/newsletter">Subscribe</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
