import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/arts/:path*",
        destination: "/cubicon-app/arts/:path*",
      },
      {
        source: "/cubion",
        destination: "/cubicon",
      },
      {
        source: "/triad-app",
        destination: "/triad-app/index.html",
      },
    ];
  },
};

export default nextConfig;
