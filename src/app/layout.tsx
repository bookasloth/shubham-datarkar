import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

import { site } from "@/lib/site";
import { buildMetadata } from "@/lib/seo";
import { siteGraph } from "@/lib/seo/entities";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/layout/footer";
import { ChromeGate } from "@/components/layout/chrome-gate";
import { ShellExtras } from "@/components/layout/shell-extras";
import { ToastProvider } from "@/components/ui/toast";
import { JsonLd } from "@/components/seo/json-ld";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { AiReferrer } from "@/components/analytics/ai-referrer";
import { AttributionProbe } from "@/components/analytics/attribution-probe";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  ...buildMetadata(),
  // Child pages export a bare keyword phrase; this appends the brand.
  // `buildMetadata({ titleAbsolute: true })` opts a page out (see /).
  title: {
    default: `${site.name} · ${site.alias}`,
    template: `%s — ${site.name}`,
  },
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  manifest: "/manifest.webmanifest",
  // favicon.ico, icon.svg, and apple-icon.png in src/app/ are auto-emitted as
  // <link rel="icon"/apple-touch-icon> by Next's file conventions.
  // Search-engine ownership tags. Sourced from env so no token is committed;
  // Next renders <meta google-site-verification> / <meta msvalidate.01> only
  // when the matching var is set (empty = no tag, safe default).
  ...(process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.GOOGLE_SITE_VERIFICATION
            ? { google: process.env.GOOGLE_SITE_VERIFICATION }
            : {}),
          ...(process.env.BING_SITE_VERIFICATION
            ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
            : {}),
        },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${poppins.variable}`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider>
          <ToastProvider>
            {/* Accessibility: skip directly to main content */}
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-input focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
            >
              Skip to content
            </a>
            {/* Lazy, client-only shell widgets (SEO C1) — needs the toast/theme
                context that CommandMenu uses, so it sits inside the providers. */}
            <ShellExtras />
            <div className="flex min-h-dvh flex-col">
              <ChromeGate><Header /></ChromeGate>
              <main id="main" className="flex-1">
                {children}
              </main>
              <ChromeGate><Footer /></ChromeGate>
            </div>
          </ToastProvider>
        </ThemeProvider>
        <JsonLd data={siteGraph()} />
        <SpeedInsights />
        <Analytics />
        <AiReferrer />
        <AttributionProbe />
      </body>
    </html>
  );
}
