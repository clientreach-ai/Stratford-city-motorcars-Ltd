/**
 * Matching a slug that arrived from a browser to a car we hold. Shared by the
 * server (`resolveVehicleBySlug()`) and the finance and part-exchange forms,
 * which resolve `?vehicle=` in the browser so those pages can stay static.
 */

/** Just enough of a public car for a `?vehicle=` link to name it. */
export interface VehicleLink {
  slug: string;
  previousSlugs: string[];
  /** The car as we list it, e.g. "2016 Mercedes-Benz SL63 AMG". */
  name: string;
}

/** The car a slug names, current or previous slug, or null when no car matches. */
export function matchVehicleSlug<T extends Pick<VehicleLink, "slug" | "previousSlugs">>(
  cars: readonly T[],
  slug: string | null | undefined,
): T | null {
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  return cars.find((car) => car.slug === slug || car.previousSlugs.includes(slug)) ?? null;
}
