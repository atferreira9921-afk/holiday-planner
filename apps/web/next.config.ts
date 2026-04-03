import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@holiday-planner/shared-types"],
  webpack: (config) => {
    // Ensure the Anthropic SDK is never bundled (AI features temporarily disabled)
    config.resolve.alias = {
      ...config.resolve.alias,
      "@anthropic-ai/sdk": false,
    };
    return config;
  },
};

export default nextConfig;
