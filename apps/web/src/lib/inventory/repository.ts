import "server-only";

import { unstable_cache } from "next/cache";

import {
  availableVehicles,
  featuredVehicles,
  findBySlug,
  makeModelIndex,
  relatedVehicles,
  resolveSlug,
  searchPublicVehicles,
  sortVehicles,
} from "@Stratford-city-motorcars-Ltd/domain/inventory/search";

import { getInventoryStore } from "./store";
import type { PublicVehicle, VehicleFacets, VehicleQuery, VehicleRecord } from "./types";
import { publicBlockers, toPublicVehicle } from "./visibility";

/**
 * Public inventory API. Every page, the sitemap and structured data read stock
 * through here and nowhere else.
 *
 * Visibility is applied once, in `loadPublicVehicles()`: a record reaches the
 * public site only through `toPublicVehicle()`, which enforces the publishing
 * rules (published or sold, complete details, price in range or POA, dealer
 * exterior and interior photography) and strips library media. Listings,
 * filters, featured and related cars additionally exclude sold cars; a sold
 * car keeps its own page, marked SOLD.
 *
 * Records are cached under the `inventory` tag. The dashboard revalidates the
 * tag after every change, and the cache also expires on its own every five
 * minutes as a safety net.
 */

export const INVENTORY_CACHE_TAG = "inventory";

const loadRecords = unstable_cache(
  async (): Promise<VehicleRecord[]> => {
    const store = await getInventoryStore();
    return store.list();
  },
  ["inventory-records"],
  { tags: [INVENTORY_CACHE_TAG], revalidate: 300 },
);

const warned = new Set<string>();

/**
 * A car marked published but withheld by a rule is logged once per process —
 * id, slug and rule codes only — so publishing never fails silently.
 */
function warnWithheld(record: VehicleRecord): void {
  const key = `${record.id}:${record.updatedAt}`;
  if (warned.has(key)) return;
  warned.add(key);
  const codes = publicBlockers(record).map((issue) => issue.code);
  console.warn(`[inventory] ${record.id} (${record.slug}) is ${record.status} but withheld: ${codes.join(", ")}`);
}

async function loadPublicVehicles(): Promise<PublicVehicle[]> {
  const records = await loadRecords();
  const now = Date.now();
  const visible: PublicVehicle[] = [];

  for (const record of records) {
    const vehicle = toPublicVehicle(record, now);
    if (vehicle) visible.push(vehicle);
    else if (record.status === "published" || record.status === "sold") warnWithheld(record);
  }

  return visible;
}

/** Cars currently for sale (published and not sold), in the default order. */
export async function getAvailableVehicles(): Promise<PublicVehicle[]> {
  return availableVehicles(await loadPublicVehicles());
}

/** A single public car, including sold cars (their pages stay up). */
export async function getVehicleBySlug(slug: string): Promise<PublicVehicle | null> {
  return findBySlug(await loadPublicVehicles(), slug);
}

/**
 * Resolves a slug the car used to have — a legacy `/sales/…` slug or one the
 * dealership has since changed — to the car's current public slug.
 */
export async function resolvePreviousSlug(slug: string): Promise<string | null> {
  return resolveSlug(await loadPublicVehicles(), slug);
}

/** Slugs for `generateStaticParams`, so every public vehicle page prerenders. */
export async function getVehicleSlugs(): Promise<string[]> {
  const all = await loadPublicVehicles();
  return all.map((vehicle) => vehicle.slug);
}

/** For the sitemap: cars for sale only (sold pages stay reachable but are not submitted). */
export async function getSitemapVehicles(): Promise<PublicVehicle[]> {
  return getAvailableVehicles();
}

/** Hand-picked cars only; may return fewer than `limit`, or none. */
export async function getFeaturedVehicles(limit = 4): Promise<PublicVehicle[]> {
  return featuredVehicles(await loadPublicVehicles(), limit);
}

/** Same make first, then closest on price. Sold cars and POA-vs-priced distance handled. */
export async function getRelatedVehicles(slug: string, limit = 3): Promise<PublicVehicle[]> {
  return relatedVehicles(await loadPublicVehicles(), slug, limit);
}

// ---- Search -------------------------------------------------------------------

export { sortVehicles };

export async function searchVehicles(
  query: VehicleQuery = {},
): Promise<{ results: PublicVehicle[]; total: number; facets: VehicleFacets }> {
  return searchPublicVehicles(await loadPublicVehicles(), query);
}

/** Make → models, for the dependent selects in the hero search. Cars for sale only. */
export async function getMakeModelIndex(): Promise<Record<string, string[]>> {
  return makeModelIndex(await loadPublicVehicles());
}
