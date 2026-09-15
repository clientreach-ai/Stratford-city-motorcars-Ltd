import "server-only";

import { unstable_cache } from "next/cache";

import { getInventoryStore } from "./store";
import {
  DEFAULT_SORT,
  type FacetValue,
  type PublicVehicle,
  type SortOption,
  type VehicleFacets,
  type VehicleQuery,
  type VehicleRecord,
} from "./types";
import { publicBlockers, selectFeatured, toPublicVehicle } from "./visibility";

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
  const all = await loadPublicVehicles();
  return sortVehicles(
    all.filter((vehicle) => !vehicle.isSold),
    DEFAULT_SORT,
  );
}

/** A single public car, including sold cars (their pages stay up). */
export async function getVehicleBySlug(slug: string): Promise<PublicVehicle | null> {
  const all = await loadPublicVehicles();
  return all.find((vehicle) => vehicle.slug === slug) ?? null;
}

/**
 * Resolves a slug the car used to have — a legacy `/sales/…` slug or one the
 * dealership has since changed — to the car's current public slug.
 */
export async function resolvePreviousSlug(slug: string): Promise<string | null> {
  const all = await loadPublicVehicles();
  const match = all.find((vehicle) => vehicle.slug === slug || vehicle.previousSlugs.includes(slug));
  return match?.slug ?? null;
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
  return selectFeatured(await loadPublicVehicles(), limit);
}

/** Same make first, then closest on price. Sold cars and POA-vs-priced distance handled. */
export async function getRelatedVehicles(slug: string, limit = 3): Promise<PublicVehicle[]> {
  const all = await loadPublicVehicles();
  const current = all.find((vehicle) => vehicle.slug === slug);
  if (!current) return [];

  const distance = (vehicle: PublicVehicle) =>
    current.price === null || vehicle.price === null
      ? Number.MAX_SAFE_INTEGER
      : Math.abs(vehicle.price - current.price);

  return all
    .filter((vehicle) => vehicle.slug !== slug && !vehicle.isSold)
    .sort((a, b) => {
      const makeScore = Number(b.make === current.make) - Number(a.make === current.make);
      return makeScore !== 0 ? makeScore : distance(a) - distance(b);
    })
    .slice(0, limit);
}

// ---- Search -------------------------------------------------------------------

function matchesAny(selected: string[] | undefined, value: string): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.some((entry) => entry.toLowerCase() === value.toLowerCase());
}

function applyFilters(all: PublicVehicle[], query: VehicleQuery): PublicVehicle[] {
  return all.filter(
    (vehicle) => matchesAny(query.make, vehicle.make) && matchesAny(query.model, vehicle.model),
  );
}

/**
 * Price sorts place POA cars with the most valuable stock: first when sorting
 * high to low, last when sorting low to high. The client uses POA for rare
 * classics whose value moves.
 */
function comparePrice(a: PublicVehicle, b: PublicVehicle, direction: 1 | -1): number {
  if (a.price === null && b.price === null) return 0;
  if (a.price === null) return direction === -1 ? -1 : 1;
  if (b.price === null) return direction === -1 ? 1 : -1;
  return (a.price - b.price) * direction;
}

const sorters: Record<SortOption, (a: PublicVehicle, b: PublicVehicle) => number> = {
  "price-desc": (a, b) => comparePrice(a, b, -1),
  "price-asc": (a, b) => comparePrice(a, b, 1),
  newest: (a, b) => new Date(b.listedAt ?? b.createdAt).getTime() - new Date(a.listedAt ?? a.createdAt).getTime(),
  "year-desc": (a, b) => b.year - a.year,
  "mileage-asc": (a, b) => a.mileage - b.mileage,
};

export function sortVehicles(vehicles: PublicVehicle[], sort: SortOption): PublicVehicle[] {
  // Stable secondary order by title keeps equal prices from reshuffling.
  return [...vehicles].sort((a, b) => sorters[sort](a, b) || a.title.localeCompare(b.title));
}

export async function searchVehicles(
  query: VehicleQuery = {},
): Promise<{ results: PublicVehicle[]; total: number; facets: VehicleFacets }> {
  const available = (await loadPublicVehicles()).filter((vehicle) => !vehicle.isSold);
  const results = sortVehicles(applyFilters(available, query), query.sort ?? DEFAULT_SORT);
  return { results, total: available.length, facets: buildFacets(available, query) };
}

/**
 * Counts are computed against the other active filter, so a facet never offers
 * a value that would return nothing, and choosing a second make widens rather
 * than narrows. Models are limited to the selected makes.
 */
function buildFacets(all: PublicVehicle[], query: VehicleQuery): VehicleFacets {
  const count = (pool: PublicVehicle[], pick: (vehicle: PublicVehicle) => string): FacetValue[] => {
    const counts = new Map<string, number>();
    for (const vehicle of pool) counts.set(pick(vehicle), (counts.get(pick(vehicle)) ?? 0) + 1);
    return [...counts.entries()]
      .map(([value, total]) => ({ value, label: value, count: total }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  return {
    make: count(applyFilters(all, { ...query, make: undefined }), (vehicle) => vehicle.make),
    model: count(applyFilters(all, { ...query, model: undefined }), (vehicle) => vehicle.model),
  };
}

/** Make → models, for the dependent selects in the hero search. Cars for sale only. */
export async function getMakeModelIndex(): Promise<Record<string, string[]>> {
  const available = await getAvailableVehicles();
  const index: Record<string, string[]> = {};
  for (const vehicle of available) {
    const models = (index[vehicle.make] ??= []);
    if (!models.includes(vehicle.model)) models.push(vehicle.model);
  }
  for (const models of Object.values(index)) models.sort();
  return index;
}
