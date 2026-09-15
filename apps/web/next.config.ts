import "@Stratford-city-motorcars-Ltd/env/web";
import type { NextConfig } from "next";

/**
 * Remote media host, when uploads move to object storage behind a CDN
 * (see src/lib/media/storage.ts). Unset while media is stored locally.
 */
const mediaPublicBase = process.env.MEDIA_PUBLIC_BASE_URL?.trim();

/**
 * Baseline security headers for every response. The Content-Security-Policy
 * sets only directives that cannot break the app — no framing by other sites,
 * no <base> or plugin injection, forms may only post back to this site — rather
 * than a script policy, which would need per-request nonces and give up static
 * rendering.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Browsers ignore HSTS over plain HTTP, so this is inert in local development.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
    ];
  },

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
