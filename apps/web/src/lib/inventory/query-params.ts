import { DEFAULT_SORT, SORT_OPTIONS, type SortOption, type VehicleQuery } from "./types";

/** What Next hands a page as `searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const values = (Array.isArray(value) ? value : [value])
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean)
    // A hand-edited URL should not be able to make the page do unbounded work.
    .slice(0, 20)
    .map((entry) => entry.slice(0, 80));
  return values.length ? values : undefined;
}

function toText(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

const sortValues = new Set<string>(SORT_OPTIONS.map((option) => option.value));

/**
 * Parses the URL into a query. Anything unrecognised is dropped rather than
 * throwing, so a hand-edited or stale link (including the old site's filter
 * parameters) still renders a sensible page.
 */
export function parseSearchParams(params: RawSearchParams): VehicleQuery {
  const sortRaw = toText(params.sort);

  return {
    make: toArray(params.make),
    model: toArray(params.model),
    sort: sortRaw && sortValues.has(sortRaw) ? (sortRaw as SortOption) : DEFAULT_SORT,
  };
}

/** Counts the filters a customer has actually applied — sort is not a filter. */
export function countActiveFilters(query: VehicleQuery): number {
  return (query.make?.length ?? 0) + (query.model?.length ?? 0);
}

/** True when the URL carries anything beyond the canonical stock page. */
export function isNonCanonicalQuery(params: RawSearchParams): boolean {
  return Object.values(params).some((value) => value !== undefined);
}

/** Rebuilds a query string, dropping empty values so URLs stay clean. */
export function toSearchString(query: VehicleQuery): string {
  const params = new URLSearchParams();
  for (const make of query.make ?? []) params.append("make", make);
  for (const model of query.model ?? []) params.append("model", model);
  if (query.sort && query.sort !== DEFAULT_SORT) params.set("sort", query.sort);
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** Human-readable summary of applied filters, used in the results heading. */
export function describeQuery(query: VehicleQuery): string | null {
  const parts: string[] = [];
  if (query.make?.length) parts.push(query.make.join(", "));
  if (query.model?.length) parts.push(query.model.join(", "));
  return parts.length ? parts.join(" · ") : null;
}
