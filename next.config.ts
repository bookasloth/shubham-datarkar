import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
