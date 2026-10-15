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
    ];
  },
};

export default nextConfig;
