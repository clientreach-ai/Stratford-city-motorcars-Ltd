import { SORT_OPTIONS, type SortOption, type VehicleQuery } from "./types";

/** What Next hands a page as `searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const values = (Array.isArray(value) ? value : [value])
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

function toNumber(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toText(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

const sortValues = new Set<string>(SORT_OPTIONS.map((option) => option.value));

/**
 * Parses the URL into a query. Anything unrecognised is dropped rather than
 * throwing, so a hand-edited or stale link still renders a sensible page.
 */
export function parseSearchParams(params: RawSearchParams): VehicleQuery {
  const sortRaw = toText(params.sort);

  return {
    q: toText(params.q),
    make: toArray(params.make),
    model: toArray(params.model),
    fuel: toArray(params.fuel),
    transmission: toArray(params.transmission),
    bodyType: toArray(params.bodyType),
    features: toArray(params.features),
    minPrice: toNumber(params.minPrice),
    maxPrice: toNumber(params.maxPrice),
    maxMileage: toNumber(params.maxMileage),
    minYear: toNumber(params.minYear),
    maxYear: toNumber(params.maxYear),
    sort: sortRaw && sortValues.has(sortRaw) ? (sortRaw as SortOption) : "newest",
  };
}

/** Counts the filters a customer has actually applied — sort is not a filter. */
export function countActiveFilters(query: VehicleQuery): number {
  let count = 0;
  for (const [key, value] of Object.entries(query)) {
    if (key === "sort") continue;
    if (value === undefined) continue;
    count += Array.isArray(value) ? value.length : 1;
  }
  return count;
}

/** Rebuilds a query string, dropping empty values so URLs stay clean. */
export function toSearchString(query: VehicleQuery): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (key === "sort" && value === "newest") continue;
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
    } else {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `?${search}` : "";
}

/** Human-readable summary of applied filters, used in the results heading. */
export function describeQuery(query: VehicleQuery): string | null {
  const parts: string[] = [];
  if (query.make?.length) parts.push(query.make.join(", "));
  if (query.model?.length) parts.push(query.model.join(", "));
  if (query.bodyType?.length) parts.push(query.bodyType.join(", ").toLowerCase());
  if (query.fuel?.length) parts.push(query.fuel.join(", ").toLowerCase());
  if (query.transmission?.length) parts.push(query.transmission.join(", ").toLowerCase());
  return parts.length ? parts.join(" · ") : null;
}
