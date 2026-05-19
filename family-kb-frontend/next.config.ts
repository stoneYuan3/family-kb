import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Claude: use BACKEND_URL env var so dev and production can point to different hosts/ports
const backendPort = process.env.BACKEND_PORT || 3000;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://localhost:${backendPort}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `http://localhost:${backendPort}/uploads/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
