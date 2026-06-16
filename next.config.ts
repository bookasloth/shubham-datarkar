import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /subscribe is used interchangeably with /newsletter across the site +
      // emails — collapse it to the one real page.
      { source: "/subscribe", destination: "/newsletter", permanent: true },
    ];
  },
};

export default nextConfig;
