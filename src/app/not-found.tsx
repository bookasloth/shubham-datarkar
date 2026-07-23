import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Container, Section } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { BlueprintFrame, CrosshairGrid, GeometricMark } from "@/components/blueprint";
import { cn } from "@/lib/utils";

const links = [
  { label: "Blog", href: "/blog" },
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "Tools", href: "/tools" },
  { label: "About", href: "/about" },
];

export default function NotFound() {
  return (
    <Section className="flex min-h-[80vh] items-center">
      <Container size="narrow">
        <BlueprintFrame className="px-6 py-20 md:py-28">
          <CrosshairGrid className="opacity-70" />
          <div className="relative text-center">
            <GeometricMark size={104} className="mx-auto" />
            <p className="mt-8 font-display text-7xl font-extrabold tracking-tight md:text-8xl">
              404
            </p>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">This page wandered off</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              The link may be broken or the page moved. Let&apos;s get you back to something useful.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/" className={cn(buttonVariants({ size: "lg" }))}>
                <BrandIcon name="Home" />
                Back home
              </Link>
              <Link href="/search" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                <BrandIcon name="Search" />
                Search the site
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center gap-1 rounded-btn border border-border px-3 py-1.5 text-sm transition-ui hover:bg-accent"
                >
                  {l.label}
                  <ArrowRight className="size-3" />
                </Link>
              ))}
            </div>
          </div>
        </BlueprintFrame>
      </Container>
    </Section>
  );
}
