import { vehicles as staticVehicles } from "./data";
import type {
  FacetValue,
  SortOption,
  Vehicle,
  VehicleFacets,
  VehicleQuery,
  VehicleView,
} from "./types";

/**
 * ============================================================================
 * INTEGRATION POINT — swap the data source here.
 * ============================================================================
 *
 * Every function below is async and returns plain objects, so replacing the
 * static array with a real source is a change to `loadVehicles()` alone. The
 * rest of the application, including all filtering and sorting, keeps working.
 *
 * Postgres via the workspace `@Stratford-city-motorcars-Ltd/db` package:
 *
 *     import { db } from "@Stratford-city-motorcars-Ltd/db";
 *     async function loadVehicles(): Promise<Vehicle[]> {
 *       return db.query.vehicles.findMany({ where: isNull(vehicles.deletedAt) });
 *     }
 *
 * Or the existing Hono API:
 *
 *     async function loadVehicles(): Promise<Vehicle[]> {
 *       const res = await fetch(`${process.env.INVENTORY_API_URL}/vehicles`, {
 *         next: { revalidate: 300, tags: ["vehicles"] },
 *       });
 *       if (!res.ok) throw new Error(`Inventory API ${res.status}`);
 *       return res.json();
 *     }
 *
 * Filtering happens in memory because the stock list is small (tens, not
 * thousands). If the inventory grows past a few hundred vehicles, push
 * `searchVehicles` down into SQL and keep the same signature.
 */
async function loadVehicles(): Promise<Vehicle[]> {
  return staticVehicles;
}

/** A listing counts as a new arrival for this many days after being listed. */
const NEW_ARRIVAL_DAYS = 30;

function toView(vehicle: Vehicle): VehicleView {
  const hasDealerPhotos = vehicle.images.length > 0;
  const displayImages = hasDealerPhotos ? vehicle.images : vehicle.libraryImages;
  const ageMs = Date.now() - new Date(vehicle.listedAt).getTime();

  return {
    ...vehicle,
    displayImages,
    awaitingPhotography: displayImages.length === 0,
    showingLibraryImages: !hasDealerPhotos && vehicle.libraryImages.length > 0,
    isNewArrival:
      vehicle.status === "available" && ageMs < NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000,
  };
}

export async function getAllVehicles(): Promise<VehicleView[]> {
  const all = await loadVehicles();
  return all.map(toView);
}

export async function getVehicleBySlug(slug: string): Promise<VehicleView | null> {
  const all = await loadVehicles();
  const match = all.find((vehicle) => vehicle.slug === slug);
  return match ? toView(match) : null;
}

/** Slugs for `generateStaticParams`, so every vehicle page prerenders. */
export async function getVehicleSlugs(): Promise<string[]> {
  const all = await loadVehicles();
  return all.map((vehicle) => vehicle.slug);
}

export async function getFeaturedVehicles(limit = 4): Promise<VehicleView[]> {
  const all = await getAllVehicles();
  const available = all.filter((vehicle) => vehicle.status !== "sold");
  const featured = available.filter((vehicle) => vehicle.featured);
  // Fall back to the most recently listed stock so the homepage is never empty.
  const pool = featured.length >= limit ? featured : [...featured, ...available.filter((v) => !v.featured)];
  return pool.slice(0, limit);
}

/** Same make first, then closest on price. Used at the foot of a vehicle page. */
export async function getRelatedVehicles(slug: string, limit = 3): Promise<VehicleView[]> {
  const all = await getAllVehicles();
  const current = all.find((vehicle) => vehicle.slug === slug);
  if (!current) return [];

  return all
    .filter((vehicle) => vehicle.slug !== slug && vehicle.status !== "sold")
    .sort((a, b) => {
      const makeScore =
        Number(b.make === current.make) - Number(a.make === current.make);
      if (makeScore !== 0) return makeScore;
      return Math.abs(a.price - current.price) - Math.abs(b.price - current.price);
    })
    .slice(0, limit);
}

// ---- Filtering ------------------------------------------------------------

function matchesAny(selected: string[] | undefined, value: string): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.some((entry) => entry.toLowerCase() === value.toLowerCase());
}

function matchesSearch(vehicle: Vehicle, term: string): boolean {
  const haystack = [
    vehicle.title,
    vehicle.make,
    vehicle.model,
    String(vehicle.year),
    vehicle.colour,
    vehicle.bodyType,
    vehicle.fuel,
    vehicle.transmission,
    vehicle.engine ?? "",
    ...vehicle.features,
  ]
    .join(" ")
    .toLowerCase();

  // Every word must appear somewhere, so "black rolls" narrows rather than widens.
  return term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function applyFilters(all: VehicleView[], query: VehicleQuery): VehicleView[] {
  return all.filter((vehicle) => {
    if (query.q && !matchesSearch(vehicle, query.q)) return false;
    if (!matchesAny(query.make, vehicle.make)) return false;
    if (!matchesAny(query.model, vehicle.model)) return false;
    if (!matchesAny(query.fuel, vehicle.fuel)) return false;
    if (!matchesAny(query.transmission, vehicle.transmission)) return false;
    if (!matchesAny(query.bodyType, vehicle.bodyType)) return false;

    if (query.features?.length) {
      const owned = vehicle.features.map((feature) => feature.toLowerCase());
      const allPresent = query.features.every((wanted) =>
        owned.some((feature) => feature.includes(wanted.toLowerCase())),
      );
      if (!allPresent) return false;
    }

    if (query.minPrice !== undefined && vehicle.price < query.minPrice) return false;
    if (query.maxPrice !== undefined && vehicle.price > query.maxPrice) return false;
    if (query.maxMileage !== undefined && vehicle.mileage > query.maxMileage) return false;
    if (query.minYear !== undefined && vehicle.year < query.minYear) return false;
    if (query.maxYear !== undefined && vehicle.year > query.maxYear) return false;

    return true;
  });
}

const sorters: Record<SortOption, (a: VehicleView, b: VehicleView) => number> = {
  newest: (a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime(),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "year-desc": (a, b) => b.year - a.year,
  "year-asc": (a, b) => a.year - b.year,
  "mileage-asc": (a, b) => a.mileage - b.mileage,
};

export async function searchVehicles(
  query: VehicleQuery = {},
): Promise<{ results: VehicleView[]; total: number; facets: VehicleFacets }> {
  const all = await getAllVehicles();
  const results = applyFilters(all, query);

  // Sold stock always sinks to the bottom, whatever the chosen sort.
  const sorted = [...results].sort((a, b) => {
    const soldScore = Number(a.status === "sold") - Number(b.status === "sold");
    if (soldScore !== 0) return soldScore;
    return sorters[query.sort ?? "newest"](a, b);
  });

  return { results: sorted, total: all.length, facets: buildFacets(all, query) };
}

// ---- Facets ---------------------------------------------------------------

/**
 * Counts are computed against the results of every *other* active filter, so a
 * facet never offers a value that would return nothing, and selecting a second
 * value within the same group widens rather than narrows.
 */
function countBy(
  all: VehicleView[],
  query: VehicleQuery,
  group: keyof VehicleQuery,
  pick: (vehicle: VehicleView) => string | string[],
): FacetValue[] {
  const others: VehicleQuery = { ...query, [group]: undefined };
  const pool = applyFilters(all, others);

  const counts = new Map<string, number>();
  for (const vehicle of pool) {
    const raw = pick(vehicle);
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Features worth filtering on — the ones buyers actually search for. */
const FILTERABLE_FEATURES = [
  "Full Service History",
  "Leather",
  "Panoramic Roof",
  "Heated Seats",
  "Sat Nav",
  "Parking Sensors",
  "Convertible Roof",
] as const;

function buildFacets(all: VehicleView[], query: VehicleQuery): VehicleFacets {
  const prices = all.map((vehicle) => vehicle.price);
  const years = all.map((vehicle) => vehicle.year);
  const mileages = all.map((vehicle) => vehicle.mileage);

  const featureCounts = FILTERABLE_FEATURES.map((feature) => {
    const others: VehicleQuery = { ...query, features: undefined };
    const pool = applyFilters(all, others);
    const count = pool.filter((vehicle) =>
      vehicle.features.some((owned) =>
        owned.toLowerCase().includes(feature.toLowerCase()),
      ),
    ).length;
    return { value: feature, label: feature, count };
  }).filter((facet) => facet.count > 0);

  return {
    make: countBy(all, query, "make", (vehicle) => vehicle.make),
    model: countBy(all, query, "model", (vehicle) => vehicle.model),
    fuel: countBy(all, query, "fuel", (vehicle) => vehicle.fuel),
    transmission: countBy(all, query, "transmission", (vehicle) => vehicle.transmission),
    bodyType: countBy(all, query, "bodyType", (vehicle) => vehicle.bodyType),
    features: featureCounts,
    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    yearRange: { min: Math.min(...years), max: Math.max(...years) },
    mileageRange: { min: Math.min(...mileages), max: Math.max(...mileages) },
  };
}

/** Make → models, for the dependent selects in the hero search. */
export async function getMakeModelIndex(): Promise<Record<string, string[]>> {
  const all = await loadVehicles();
  const index: Record<string, string[]> = {};
  for (const vehicle of all) {
    const models = (index[vehicle.make] ??= []);
    if (!models.includes(vehicle.model)) models.push(vehicle.model);
  }
  for (const models of Object.values(index)) models.sort();
  return index;
}
