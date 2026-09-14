import type { PhotoView, Vehicle } from "./types";

/**
 * Publishing rules. What decides whether a vehicle may appear on the public
 * site, and which vehicles the homepage features.
 *
 * `published` is the dealership's intent to list a car. It is necessary but
 * not sufficient: a car also has to pass every check below. The checks exist
 * so that flipping one flag on an unfinished record cannot put it in front of
 * buyers. `repository.ts` applies them in `loadVehicles()`, so every listing,
 * page, facet, static param and sitemap entry inherits them.
 *
 * Only type imports here, so the rules can be exercised directly by
 * `scripts/check-inventory.mjs` without a bundler.
 */

/**
 * The client's normal stock range (September 2026 intake): roughly £20,000 to
 * £1,000,000, inclusive. A price outside it is treated as a data error, not a
 * listing.
 *
 * This is also what keeps the previous site's £12,000 ML63 AMG and £16,000
 * Jaguar XF off the site: they are not stock the business now trades in, and
 * their records are kept only as history. If the client confirms a genuine car
 * outside this range, change the range here deliberately; do not work around
 * it per vehicle.
 */
export const PUBLIC_PRICE_RANGE = { min: 20_000, max: 1_000_000 } as const;

/**
 * The client asked for cars to stay hidden until properly photographed, and
 * proper photography includes the interior. Only the dealership's own
 * photographs count (`provenance: "dealer"`). Library stand-ins show a
 * different car of the same model, so they never satisfy this.
 *
 * These are minimums for publishing, not the full shot list in PHOTOGRAPHY.md.
 */
export const REQUIRED_DEALER_PHOTOS: Readonly<Partial<Record<PhotoView, number>>> = {
  exterior: 1,
  interior: 1,
};

export type PublicationBlocker =
  | "not-published"
  | "price-out-of-range"
  | `missing-${PhotoView}-photography`;

/** Every reason this vehicle may not be shown publicly. Empty means it may. */
export function publicationBlockers(vehicle: Vehicle): PublicationBlocker[] {
  const blockers: PublicationBlocker[] = [];

  if (!vehicle.published) blockers.push("not-published");

  if (vehicle.price < PUBLIC_PRICE_RANGE.min || vehicle.price > PUBLIC_PRICE_RANGE.max) {
    blockers.push("price-out-of-range");
  }

  for (const [view, minimum] of Object.entries(REQUIRED_DEALER_PHOTOS) as [PhotoView, number][]) {
    const count = vehicle.images.filter(
      (image) => image.provenance === "dealer" && image.view === view,
    ).length;
    if (count < minimum) blockers.push(`missing-${view}-photography`);
  }

  return blockers;
}

export function isPubliclyVisible(vehicle: Vehicle): boolean {
  return publicationBlockers(vehicle).length === 0;
}

/**
 * The homepage shows only cars the dealership has hand-picked (`featured`),
 * never other stock to fill the grid. Fewer than `limit`, or none, is a valid
 * result and the homepage handles it. Sold cars are not featured.
 */
export function selectFeatured<T extends Pick<Vehicle, "featured" | "status">>(
  vehicles: T[],
  limit: number,
): T[] {
  return vehicles
    .filter((vehicle) => vehicle.featured && vehicle.status !== "sold")
    .slice(0, limit);
}
