import {
  DEFAULT_SORT,
  type FacetValue,
  type PublicVehicle,
  type SortOption,
  type VehicleFacets,
  type VehicleQuery,
} from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { selectFeatured } from "@Stratford-city-motorcars-Ltd/core/visibility";

/**
 * Searching, sorting and grouping public stock.
 *
 * Pure functions over `PublicVehicle[]`, shared by the website's repository and
 * the API server so both list stock in exactly the same order with the same
 * filters. Callers are responsible for loading the vehicles and applying the
 * publishing rules first (`toPublicVehicle()`).
 */

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

/** Cars currently for sale (published and not sold), in the default order. */
export function availableVehicles(all: PublicVehicle[]): PublicVehicle[] {
  return sortVehicles(
    all.filter((vehicle) => !vehicle.isSold),
    DEFAULT_SORT,
  );
}

/** A single public car by its current slug, including sold cars (their pages stay up). */
export function findBySlug(all: PublicVehicle[], slug: string): PublicVehicle | null {
  return all.find((vehicle) => vehicle.slug === slug) ?? null;
}

/**
 * Resolves a slug the car used to have — a legacy `/sales/…` slug or one the
 * dealership has since changed — to the car's current public slug.
 */
export function resolveSlug(all: PublicVehicle[], slug: string): string | null {
  const match = all.find((vehicle) => vehicle.slug === slug || vehicle.previousSlugs.includes(slug));
  return match?.slug ?? null;
}

/** Hand-picked cars only; may return fewer than `limit`, or none. */
export function featuredVehicles(all: PublicVehicle[], limit: number): PublicVehicle[] {
  return selectFeatured(all, limit);
}

/** Same make first, then closest on price. Sold cars and POA-vs-priced distance handled. */
export function relatedVehicles(all: PublicVehicle[], slug: string, limit: number): PublicVehicle[] {
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

export function searchPublicVehicles(
  all: PublicVehicle[],
  query: VehicleQuery = {},
): { results: PublicVehicle[]; total: number; facets: VehicleFacets } {
  const available = all.filter((vehicle) => !vehicle.isSold);
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
export function makeModelIndex(all: PublicVehicle[]): Record<string, string[]> {
  const index: Record<string, string[]> = {};
  for (const vehicle of availableVehicles(all)) {
    const models = (index[vehicle.make] ??= []);
    if (!models.includes(vehicle.model)) models.push(vehicle.model);
  }
  for (const models of Object.values(index)) models.sort();
  return index;
}
