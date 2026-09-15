import "@Stratford-city-motorcars-Ltd/env/web";
import type { NextConfig } from "next";

/**
 * Remote media host, when uploads move to object storage behind a CDN
 * (see src/lib/media/storage.ts). Unset while media is stored locally.
 */
const mediaPublicBase = process.env.MEDIA_PUBLIC_BASE_URL?.trim();

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,

  /**
   * Legacy URLs from the previous site (see docs/STRATFORD_MIGRATION_AUDIT.md).
   * Only paths with a real equivalent are redirected. Legacy vehicle pages
   * (`/sales/:slug`) are resolved per car in app/sales/[slug]/route.ts, and
   * `/hire` deliberately has no redirect: there is no equivalent, so it 404s.
   */
  async redirects() {
    return [
      { source: "/sales", destination: "/vehicles", permanent: true },
      { source: "/used-cars-stratford", destination: "/vehicles", permanent: true },
      { source: "/mission", destination: "/about", permanent: true },
      { source: "/admin", destination: "/login", permanent: true },
      { source: "/admin/:path*", destination: "/login", permanent: true },
    ];
  },

  images: {
    // AVIF first for browsers that accept it (typically 20–30% smaller than
    // WebP for photographs), WebP otherwise.
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // Breakpoints tuned to the layouts: the vehicle gallery peaks at ~800 CSS px
    // (1600 device px at 2×), cards at ~420 CSS px. 3840 is dropped — nothing on
    // the site is ever that wide.
    deviceSizes: [640, 750, 828, 1080, 1280, 1600, 1920, 2560],
    imageSizes: [32, 64, 128, 256, 384],
    // Optimised variants are cached for 30 days. Uploaded media has unique file
    // names; brand assets change rarely.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Only the site's own images may be optimised, and never with a query string.
    localPatterns: [
      { pathname: "/brand/**", search: "" },
      { pathname: "/vehicles/**", search: "" },
      { pathname: "/media/**", search: "" },
    ],
    remotePatterns: mediaPublicBase ? [new URL(`${mediaPublicBase.replace(/\/$/, "")}/**`)] : [],
  },
};

export default nextConfig;
