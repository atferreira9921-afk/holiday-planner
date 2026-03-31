import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@holiday-planner/shared-types"],
};

export default nextConfig;
