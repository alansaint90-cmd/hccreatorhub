import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
