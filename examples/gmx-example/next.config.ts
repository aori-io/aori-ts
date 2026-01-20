import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for @aori/fonts package
  transpilePackages: ["@aori/fonts"],
  
  // Turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {},
  
  // Suppress console logs in production (optional)
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"], // Keep errors and warnings
    } : false,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
