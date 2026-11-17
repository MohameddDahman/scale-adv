import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // One format halves the work and cache space; WebP is what Next recommends.
    formats: ["image/webp"],
    // Keep in sync with ImageWidth in src/lib/image-url.ts. Uploads are at most
    // 1920 px wide, so larger variants would only waste cache space.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    qualities: [75],
    // An uploaded file never changes (a new upload gets a new address), so its
    // optimized copies can be cached for a month. Visitors are then served from
    // this cache instead of Convex, which keeps the free plan's 1 GB of monthly
    // file downloads for the dashboard.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    maximumResponseBody: 5_000_000,
    remotePatterns: [{ protocol: "https", hostname: "*.convex.cloud", pathname: "/api/storage/**" }],
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
