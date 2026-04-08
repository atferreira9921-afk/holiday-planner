import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js needs inline scripts for hydration; nonces would be ideal but
      // require edge middleware — 'unsafe-inline' is the practical default for now
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Images: self + Supabase storage + weather API icons
      "img-src 'self' data: blob: https://*.supabase.co https://openweathermap.org",
      // Fetch/XHR: self + Supabase + Anthropic proxy + external APIs
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://cst-ai-proxy.azurewebsites.net https://api.exchangerate-api.com https://api.open-meteo.com https://api.resend.com https://unpkg.com https://nominatim.openstreetmap.org https://serpapi.com",
      "font-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@holiday-planner/shared-types"],
  // Always start from a clean .next on each build — prevents stale
  // TypeScript incremental cache (.tsbuildinfo) from causing false errors
  cleanDistDir: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
