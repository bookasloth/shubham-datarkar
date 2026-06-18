import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/page-hero";
import { Container, Section } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export const metadata = buildMetadata({
  title: "Help Center",
  description: "Answers to common questions about the newsletter, working together, and support.",
  path: "/help",
});

const GROUPS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "Newsletter",
    items: [
      { q: "How do I subscribe?", a: "Enter your email in the newsletter form on the site. You'll get a confirmation and then the regular issues." },
      { q: "How often do you send?", a: "Roughly weekly — strategy, build logs, and the occasional hard truth. No spam." },
      { q: "How do I unsubscribe?", a: "Use the unsubscribe link in any email, or the unsubscribe page. You're removed immediately." },
    ],
  },
  {
    title: "Working together",
    items: [
      { q: "What do you offer?", a: "SEO and organic growth, performance marketing, AI automation, and speaking. See the Services page for details." },
      { q: "How do I book a call?", a: "Use the contact form, or book directly through the scheduling link on the site." },
      { q: "How fast do you reply?", a: "Within one business day, usually sooner." },
    ],
  },
  {
    title: "Support",
    items: [
      { q: "What is the support page?", a: "A way to back the work with a coffee or toffee. It keeps the free tools and writing coming." },
      { q: "Do I get a receipt?", a: "Yes — the payment processor emails a receipt to the address you provide at checkout." },
    ],
  },
  {
    title: "Privacy & data",
    items: [
      { q: "What data do you store?", a: "Only what you submit (contact details, newsletter email) plus aggregate analytics. See the Privacy Policy." },
      { q: "Can I delete my data?", a: "Yes — email hello@shubhamdatarkar.com and it's removed." },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHero
        eyebrow="Help Center"
        title="How can I help?"
        description="Quick answers to the things people ask most. Still stuck? Reach out — I read every message."
        crumbs={[{ label: "Home", href: "/" }, { label: "Help Center" }]}
      />
      <Section>
        <Container size="narrow">
          <div className="flex flex-col gap-10">
            {GROUPS.map((g) => (
              <section key={g.title}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {g.title}
                </h2>
                <dl className="mt-4 divide-y divide-border rounded-card border border-border">
                  {g.items.map((it) => (
                    <div key={it.q} className="p-4">
                      <dt className="font-medium">{it.q}</dt>
                      <dd className="mt-1 text-sm text-muted-foreground">{it.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            <div className="flex flex-wrap items-center gap-3 rounded-card border border-border p-6">
              <p className="text-sm text-muted-foreground">Didn&apos;t find your answer?</p>
              <Button asChild size="sm">
                <Link href="/contact">Contact me</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
