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
    ],
  },
  // Tree-shake large icon/UI barrels so each page ships only the components it
  // uses — smaller client bundles and faster dev compiles.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@phosphor-icons/react",
      "framer-motion",
    ],
  },
  async redirects() {
    return [
      // /subscribe is used interchangeably with /newsletter across the site +
      // emails — collapse it to the one real page.
      { source: "/subscribe", destination: "/newsletter", permanent: true },
    ];
  },
};

export default nextConfig;
