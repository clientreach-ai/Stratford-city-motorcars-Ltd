import {
  DEFAULT_SORT,
  SORT_OPTIONS,
  type FacetValue,
  type SortOption,
  type VehicleFacets,
  type VehicleQuery,
} from "./types";

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

/**
 * Cars per page on the stock listing — four rows of the three-column grid on a
 * desktop, and a page a phone can scroll without losing its place.
 */
export const PAGE_SIZE = 12;

/**
 * The page a customer asked for. Anything that is not a whole number above one
 * — a stale link, a hand-edited URL — is the first page rather than an error.
 */
export function parsePage(params: RawSearchParams): number {
  const raw = Number(toText(params.page));
  return Number.isInteger(raw) && raw > 1 ? raw : 1;
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

/** The same filters and sort on another page. Page one carries no `page`. */
export function toPageSearchString(query: VehicleQuery, page: number): string {
  const search = toSearchString(query);
  if (page <= 1) return search;
  return `${search ? `${search}&` : "?"}page=${page}`;
}

/**
 * Human-readable summary of applied filters, used in the results heading.
 *
 * Only values we actually hold are named, and they are named as our own stock
 * spells them: a filter typed into the address bar would otherwise put whatever
 * it carried straight into the page's heading.
 */
export function describeQuery(query: VehicleQuery, facets: VehicleFacets): string | null {
  const known = (selected: string[] | undefined, options: FacetValue[]): string[] =>
    (selected ?? []).flatMap((value) => {
      const match = options.find((option) => option.value.toLowerCase() === value.toLowerCase());
      return match ? [match.label] : [];
    });

  const parts: string[] = [];
  const makes = known(query.make, facets.make);
  const models = known(query.model, facets.model);
  if (makes.length) parts.push(makes.join(", "));
  if (models.length) parts.push(models.join(", "));
  return parts.length ? parts.join(" · ") : null;
}
