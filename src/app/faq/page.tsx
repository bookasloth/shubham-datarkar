import { buildMetadata, breadcrumbSchema, faqSchema } from "@/lib/seo";
import { faqs } from "@/lib/data/site-content";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CtaBand } from "@/components/sections/cta-band";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "Questions, Answered",
  description:
    "Answers to common questions about working with a marketing and AI founder — process, pricing, timelines, and approach, before we start.",
  ogTitle: "Questions, answered",
  ogDescription:
    "The things people ask before we work together — process, pricing, and approach. If yours isn't here, just get in touch.",
  path: "/faq",
});

export default function FaqPage() {
  const groups = Array.from(new Set(faqs.map((f) => f.group)));

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]),
          faqSchema(faqs),
        ]}
      />
      <PageHero
        eyebrow="FAQ"
        title="Questions, answered"
        description="The things people ask before we work together. If yours isn't here, just get in touch."
        crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
      />
      <Section>
        <Container size="narrow">
          <div className="flex flex-col gap-12">
            {groups.map((group) => (
              <Reveal key={group}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group}
                </h2>
                <Accordion type="single" collapsible>
                  {faqs
                    .filter((f) => f.group === group)
                    .map((f) => (
                      <AccordionItem key={f.question} value={f.question}>
                        <AccordionTrigger>{f.question}</AccordionTrigger>
                        <AccordionContent>{f.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
      <CtaBand title="Still have a question?" description="Send it over — I read every message and reply within a business day." />
    </>
  );
}
