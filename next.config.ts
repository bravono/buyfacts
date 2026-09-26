import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
