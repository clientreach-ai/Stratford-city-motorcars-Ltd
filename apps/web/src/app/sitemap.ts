import type { MetadataRoute } from "next";

import { getSitemapVehicles } from "@/lib/inventory/repository";
import { absoluteUrl } from "@/lib/seo";
import { site } from "@/lib/site";

/**
 * Every indexable route. The previous site had no sitemap at all — it served
 * its app shell for /sitemap.xml — so this is new ground for the business.
 *
 * Static pages carry no `lastModified`: a build date is not a content date,
 * and search engines learn to ignore sitemaps that claim false freshness.
 * Vehicles use their real `updatedAt` and list their photographs.
 *
 * Excluded: the interim noindex legal pages, sold cars (their pages stay up
 * but are not submitted), and hidden or draft stock.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await getSitemapVehicles();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/vehicles`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site.url}/finance`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/part-exchange`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site.url}/contact`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const vehicleRoutes: MetadataRoute.Sitemap = vehicles.map((vehicle) => ({
    url: `${site.url}/vehicles/${vehicle.slug}`,
    lastModified: new Date(vehicle.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
    images: vehicle.images.slice(0, 20).map((image) => absoluteUrl(image.src)),
  }));

  return [...staticRoutes, ...vehicleRoutes];
}
