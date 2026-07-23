import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase Storage serves photos from <project-ref>.supabase.co — next/image
  // needs an explicit remote pattern or it 400s on every photo.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Own asset CDN (already trusted in the CSP img-src) — partner logos, etc.
      {
        protocol: "https",
        hostname: "company-assets.bookasloth.in",
        pathname: "/images/**",
      },
      // Project logos + website assets (also in the CSP img-src allowlist).
      {
        protocol: "https",
        hostname: "website-assets.shubhamdatarkar.com",
        pathname: "/images/**",
      },
    ],
  },
  // Tree-shake large icon/UI barrels so each page ships only the components it
  // uses — smaller client bundles and faster dev compiles.
  experimental: {
    // Enables React's <ViewTransition> for shared-element morphs on navigation.
    // Additive: without browser support, pages work normally, just un-animated.
    viewTransition: true,
    optimizePackageImports: [
      "lucide-react",
      "@phosphor-icons/react",
      "framer-motion",
    ],
  },
  async redirects() {
    // One canonical host: https://shubhamdatarkar.com. Any www. variant or the
    // .in mirror 308s to the apex, so duplicate hosts never get indexed and no
    // link equity leaks. HTTP→HTTPS is handled by `upgrade-insecure-requests`
    // (CSP) + Vercel's edge, so only the host needs folding here.
    const toApex = (host: string) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://shubhamdatarkar.com/:path*",
      permanent: true,
    });
    return [
      // /subscribe is used interchangeably with /newsletter across the site +
      // emails — collapse it to the one real page.
      { source: "/subscribe", destination: "/newsletter", permanent: true },
      toApex("www.shubhamdatarkar.com"),
      toApex("shubhamdatarkar.in"),
      toApex("www.shubhamdatarkar.in"),
    ];
  },
  // Security headers (audit M-1). Clickjacking, MIME-sniff, referrer, and a CSP
  // scoped to the origins the app actually loads: Razorpay Checkout, Vercel
  // Analytics/Speed Insights, Supabase (REST + realtime wss + Storage images),
  // the asset CDNs that serve site images (company-assets.bookasloth.in,
  // website-assets.shubhamdatarkar.com), and the two known embed providers
  // (YouTube-nocookie, OpenStreetMap).
  // ponytail: `script-src` keeps 'unsafe-inline' — the app has no user-HTML XSS
  // sink (only escaped JSON-LD), and nonce-based CSP needs a proxy rewrite that
  // risks breaking Next's inline theme/hydration scripts. Move to nonces if a
  // real sink ever lands. frame-ancestors 'none' is the clickjacking win here.
  async headers() {
    // Dev only: React's dev build uses eval() for debugging; production never does.
    const scriptEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${scriptEval} https://checkout.razorpay.com https://va.vercel-scripts.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://company-assets.bookasloth.in https://website-assets.shubhamdatarkar.com https://www.openstreetmap.org",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.razorpay.com https://*.vercel-insights.com https://va.vercel-scripts.com",
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.youtube-nocookie.com https://www.openstreetmap.org",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
