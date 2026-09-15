import type { MetadataRoute } from "next";

import { getSitemapVehicles } from "@/lib/inventory/repository";
import { site } from "@/lib/site";

/**
 * Every indexable route. The previous site had no sitemap at all — it served
 * the SPA shell for /sitemap.xml — so this is new ground for them.
 *
 * Admin routes are excluded here and disallowed in robots.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await getSitemapVehicles();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = (
    [
      { url: `${site.url}`, changeFrequency: "weekly", priority: 1 },
      { url: `${site.url}/vehicles`, changeFrequency: "daily", priority: 0.9 },
      { url: `${site.url}/finance`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${site.url}/part-exchange`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${site.url}/about`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${site.url}/contact`, changeFrequency: "monthly", priority: 0.7 },
      // /privacy, /terms and /cookies are interim noindex placeholders and are
      // deliberately left out until approved documents replace them.
    ] as const
  ).map((entry) => ({ ...entry, lastModified: now }));

  // Cars for sale only. A sold car keeps its page but is not submitted.
  const vehicleRoutes: MetadataRoute.Sitemap = vehicles.map((vehicle) => ({
    url: `${site.url}/vehicles/${vehicle.slug}`,
    lastModified: new Date(vehicle.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...vehicleRoutes];
}
