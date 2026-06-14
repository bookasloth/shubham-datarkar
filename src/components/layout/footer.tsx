import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { footerNav, socials, site } from "@/lib/site";
import { Logo } from "@/components/brand/logo";
import { NewsletterForm } from "@/components/sections/newsletter-form";

export function Footer() {
  const year = 2026;

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-[var(--container-page)] px-6 py-16 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand + newsletter */}
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {site.tagline} A founder-first headquarters at the intersection of marketing, product, and AI.
            </p>
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">One idea every Tuesday.</p>
              <NewsletterForm />
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((group) => (
              <nav key={group.label} aria-label={group.label}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted-foreground transition-ui hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-border pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              © {year} {site.name}
            </span>
            <span aria-hidden>·</span>
            <span>{site.domain}</span>
            <span aria-hidden>·</span>
            <span>{site.altUrl.replace("https://", "")}</span>
          </div>
          <ul className="flex flex-wrap items-center gap-4">
            {socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-ui hover:text-foreground"
                >
                  {s.label}
                  <ArrowUpRight className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
