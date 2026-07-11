import { Container, Section } from "@/components/layout/container";
import { Reveal } from "@/components/motion/reveal";

/** The AEO "TL;DR" passage: a self-contained answer engines can lift and cite. */
export function AnswerBlock({ text }: { text: string }) {
  return (
    <Section className="pt-0">
      <Container>
        <Reveal>
          <p className="mx-auto max-w-3xl border-l-2 border-foreground/20 pl-5 text-lg leading-8 text-foreground/90 md:text-xl">
            {text}
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
