import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarCheck,
  Clock,
  CreditCard,
  Users,
} from "lucide-react";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { products, getProduct } from "@/lib/data/products";
import { Container, Section } from "@/components/layout/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/cards/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return buildMetadata({ title: "Product", path: `/products/${slug}` });
  return buildMetadata({ title: `${product.name} — ${product.tagline}`, description: product.about.slice(0, 160), path: `/products/${product.slug}` });
}

const bookASloth = {
  whatWeDo: [
    { icon: CalendarCheck, label: "Online Bookings" },
    { icon: CreditCard, label: "Payment Collection" },
    { icon: BellRing, label: "Smart Reminders" },
    { icon: Clock, label: "Availability Management" },
    { icon: Users, label: "Client Management" },
    { icon: BarChart3, label: "Booking Insights" },
  ],
  whoWeServe: [
    "Makeup Studios",
    "Salons",
    "Coaches & Consultants",
    "Fitness Trainers",
    "Therapists",
    "Independent Professionals",
    "Multi-staff Studios",
  ],
  model: [
    "Simple yearly subscription",
    "Transparent per-booking fee",
    "No marketplace commissions",
    "Affordable, sustainable, scalable",
  ],
};

export default async function ProductBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = products.filter((p) => p.slug !== product.slug).slice(0, 3);
  const isSloth = product.slug === "book-a-sloth";

  return (
    <div style={{ ["--brand" as string]: product.color }}>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Products", path: "/products" },
          { name: product.name, path: `/products/${product.slug}` },
        ])}
      />

      {/* Accent bar (brand touch 1) */}
      <div className="h-1 w-full" style={{ backgroundColor: "var(--brand)" }} aria-hidden />

      {/* Hero */}
      <Section bleed className="border-b border-border">
        <Container size="narrow" className="py-14 md:py-20">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Products", href: "/products" }, { label: product.name }]}
            className="mb-8"
          />
          <div className="flex items-center gap-2">
            {/* status dot (brand touch 2) */}
            <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--brand)" }} aria-hidden />
            <Badge variant="muted">{product.category}</Badge>
            <Badge variant="outline">{product.status}</Badge>
          </div>
          <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight md:text-5xl">{product.name}</h1>
          <p className="mt-3 text-lg font-medium text-muted-foreground">{product.tagline}</p>
          <p className="mt-6 text-[17px] leading-8 text-foreground/90">{product.about}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {product.url ? (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                // CTA in brand color (brand touch 3)
                className={cn(buttonVariants({ size: "lg" }), "text-white hover:opacity-90")}
                style={{ backgroundColor: "var(--brand)" }}
              >
                Visit {product.name}
                <ArrowUpRight />
              </a>
            ) : (
              <span className={cn(buttonVariants({ variant: "outline", size: "lg" }), "pointer-events-none opacity-70")}>
                In development
              </span>
            )}
            <Link href="/products" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              All products
              <ArrowRight />
            </Link>
          </div>

          {/* Brand swatch (brand touch 4) */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-input border border-border px-3 py-1.5 text-xs text-muted-foreground">
            <span className="size-4 rounded" style={{ backgroundColor: "var(--brand)" }} aria-hidden />
            Brand color {product.color}
          </div>
        </Container>
      </Section>

      {/* Book A Sloth — extended brand content */}
      {isSloth && (
        <>
          <Section>
            <Container>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Your brand. Your clients. Your control.</h2>
                <p className="mt-3 text-muted-foreground">
                  An automation-first scheduling platform for service professionals and studios in India. Not a
                  marketplace — bookings, payments, reminders, availability, and customer communication in one calm
                  system.
                </p>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bookASloth.whatWeDo.map((w) => (
                  <Card key={w.label} className="flex items-center gap-3 p-5">
                    {/* icon in brand color (brand touch 5) */}
                    <span className="flex size-10 items-center justify-center rounded-card" style={{ backgroundColor: "color-mix(in srgb, var(--brand) 12%, transparent)" }}>
                      <w.icon className="size-5" style={{ color: "var(--brand)" }} aria-hidden />
                    </span>
                    <span className="font-medium">{w.label}</span>
                  </Card>
                ))}
              </div>
              <p className="mt-6 text-center text-sm text-muted-foreground">Less admin. More focus. Predictable growth.</p>
            </Container>
          </Section>

          <Section bleed className="border-y border-border bg-card py-16">
            <Container>
              <div className="grid gap-12 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Who we serve</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {bookASloth.whoWeServe.map((w) => (
                      <span key={w} className="rounded-btn border border-border bg-background px-3 py-1.5 text-sm">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Business model</h3>
                  <ul className="mt-4 flex flex-col gap-2">
                    {bookASloth.model.map((m) => (
                      <li key={m} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--brand)" }} aria-hidden />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Container>
          </Section>
        </>
      )}

      {/* Related */}
      <Section>
        <Container>
          <h2 className="mb-8 text-2xl font-bold tracking-tight">More from Timewheel</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </Container>
      </Section>
    </div>
  );
}
