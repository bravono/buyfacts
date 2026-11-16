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
      {
        source: "/rule-of-three-app/:path*",
        destination: "/rule-of-three-app/index.html",
      },
      {
        source: "/rule-of-three-app",
        destination: "/rule-of-three-app/index.html",
      },
      {
        source: "/r3-app",
        destination: "/rule-of-three-app/index.html",
      },
      {
        source: "/r3",
        destination: "/rule-of-three",
      },
    ];
  },
};

export default nextConfig;
