import type { MetadataRoute } from "next";

import { getAllVehicles } from "@/lib/inventory/repository";
import { site } from "@/lib/site";

/**
 * Every indexable route. The previous site had no sitemap at all — it served
 * the SPA shell for /sitemap.xml — so this is new ground for them.
 *
 * Admin routes are excluded here and disallowed in robots.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await getAllVehicles();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = (
    [
      { url: `${site.url}`, changeFrequency: "weekly", priority: 1 },
      { url: `${site.url}/vehicles`, changeFrequency: "daily", priority: 0.9 },
      { url: `${site.url}/finance`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${site.url}/part-exchange`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${site.url}/hire`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${site.url}/about`, changeFrequency: "monthly", priority: 0.6 },
      { url: `${site.url}/contact`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${site.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
      { url: `${site.url}/terms`, changeFrequency: "yearly", priority: 0.2 },
      { url: `${site.url}/cookies`, changeFrequency: "yearly", priority: 0.2 },
    ] as const
  ).map((entry) => ({ ...entry, lastModified: now }));

  const vehicleRoutes: MetadataRoute.Sitemap = vehicles
    // A sold car keeps its page but should not be pushed at crawlers.
    .filter((vehicle) => vehicle.status !== "sold")
    .map((vehicle) => ({
      url: `${site.url}/vehicles/${vehicle.slug}`,
      lastModified: new Date(vehicle.listedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [...staticRoutes, ...vehicleRoutes];
}
