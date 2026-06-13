import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Thank You",
  description: "Your message was received.",
  path: "/success",
  noIndex: true,
});

const next = [
  { label: "Read the latest writing", href: "/blog" },
  { label: "Try a free tool", href: "/tools" },
  { label: "Browse case studies", href: "/case-studies" },
];

export default function SuccessPage() {
  return (
    <Section>
      <Container size="narrow" className="py-10">
        <Card className="p-8 text-center md:p-12">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-foreground text-background">
            <Check className="size-7" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">You&apos;re all set</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Thanks for reaching out. I read every message personally and reply within one business day — usually
            sooner.
          </p>
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
            Back to home
            <ArrowRight />
          </Link>
          <div className="mt-10 border-t border-border pt-8">
            <p className="text-sm font-medium text-muted-foreground">While you wait</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {next.map((n) => (
                <Link key={n.href} href={n.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
