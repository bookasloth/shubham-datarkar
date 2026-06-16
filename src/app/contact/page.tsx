import Link from "next/link";
import { Mail, MessageSquare } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "@/components/ui/copy-button";
import { buttonVariants } from "@/components/ui/button";
import { ContactForm } from "@/components/sections/contact-form";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Contact",
  description: "Start a project, book a call, or send a brief. Replies within one business day.",
  path: "/contact",
});

const paths = [
  { label: "Agency & growth work", detail: "Full-funnel growth via The Bogus Company.", href: "/services" },
  { label: "Consulting & advisory", detail: "Founder-to-founder, bi-weekly sessions.", href: "/services/advisory" },
  { label: "Speaking & workshops", detail: "Talks and workshops for your event.", href: "/speaking" },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])} />
      <PageHero
        eyebrow="Contact"
        title="Let's talk"
        description="Tell me what you're working on. I read every message and reply within one business day."
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-6 md:p-8">
              <ContactForm />
            </Card>

            <aside className="flex flex-col gap-6">
              <Card className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Prefer to talk live?
                </h2>
                <a
                  href={site.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}
                >
                  <BrandIcon name="CalendarCheck" />
                  Book a call
                </a>
                <Separator className="my-5" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground" />
                    <span>{site.email}</span>
                  </div>
                  <CopyButton value={site.email} label="Copy" />
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <MessageSquare className="size-4" />
                  Three ways to work together
                </h2>
                <ul className="mt-4 flex flex-col divide-y divide-border">
                  {paths.map((p) => (
                    <li key={p.label} className="py-3 first:pt-0 last:pb-0">
                      <Link href={p.href} className="group block">
                        <span className="font-medium transition-ui group-hover:text-muted-foreground">{p.label}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{p.detail}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
