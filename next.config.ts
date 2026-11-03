import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // WebP encodes ~5x faster than AVIF, so the first visitor never waits for the optimizer
    formats: ["image/webp"],
    // uploaded photos change in place, so keep the optimizer cache short
    minimumCacheTTL: 60,
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600],
    imageSizes: [48, 64, 96, 128, 256, 384, 520],
  },
  async redirects() {
    return [{ source: "/designer", destination: "/products", permanent: false }];
  },
};

export default nextConfig;
