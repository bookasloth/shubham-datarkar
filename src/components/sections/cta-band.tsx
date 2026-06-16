import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site } from "@/lib/site";
import { Container, Section } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function CtaBand({
  title = "Have a project? Let's talk.",
  description = "Whether it's organic growth, performance, AI workflows, or a product you need built — start with a conversation.",
  primaryLabel = "Book a call",
  secondaryLabel = "Start a project",
}: {
  title?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  return (
    <Section>
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-card bg-foreground px-6 py-14 text-background md:px-14 md:py-20">
            <div className="bg-dots pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-background md:text-4xl">{title}</h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-background/70 md:text-lg">{description}</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={site.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full bg-background text-foreground hover:bg-background/90 sm:w-auto",
                  )}
                >
                  <BrandIcon name="CalendarCheck" />
                  {primaryLabel}
                </a>
                <Link
                  href="/contact"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full border-background/25 bg-transparent text-background hover:bg-background/10 hover:text-background sm:w-auto",
                  )}
                >
                  {secondaryLabel}
                  <ArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
