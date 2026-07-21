import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/sonic-tapes",
  images: {
    // Static export has no image optimization server; Supabase Storage URLs
    // are served as-is.
    unoptimized: true,
  },
};

export default nextConfig;
