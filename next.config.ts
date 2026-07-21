import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/basePath";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  images: {
    // Static export has no image optimization server; Supabase Storage URLs
    // are served as-is.
    unoptimized: true,
  },
};

export default nextConfig;
