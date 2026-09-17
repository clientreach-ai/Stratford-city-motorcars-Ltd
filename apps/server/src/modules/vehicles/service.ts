import type { PublicVehicle } from "@Stratford-city-motorcars-Ltd/core/vehicle";
import { toPublicVehicle } from "@Stratford-city-motorcars-Ltd/core/visibility";

import { revalidateWebsite } from "../../lib/revalidate";
import { listVehicles } from "./repository";

/**
 * Public stock is recomputed from the database at most every 30 seconds per
 * process, and immediately after any staff change made through this server.
 */
const PUBLIC_TTL_MS = 30_000;
let publicCache: { at: number; vehicles: PublicVehicle[] } | null = null;

/**
 * Every public car (published or sold), passed through the publishing rules.
 * A representative finance example is a financial promotion that the website
 * only shows behind its own compliance switch, so the API never exposes it.
 * Reservation and sale details are never read here.
 */
export async function loadPublicVehicles(): Promise<PublicVehicle[]> {
  const now = Date.now();
  if (publicCache && now - publicCache.at < PUBLIC_TTL_MS) return publicCache.vehicles;

  const vehicles: PublicVehicle[] = [];
  for (const { record } of await listVehicles()) {
    const vehicle = toPublicVehicle(record, now);
    if (vehicle) {
      const { financeExample: _promotion, ...rest } = vehicle;
      vehicles.push(rest);
    }
  }
  publicCache = { at: now, vehicles };
  return vehicles;
}

/** Call after any change to stock: clears this server's cache and the website's. */
export function stockChanged(): void {
  publicCache = null;
  revalidateWebsite();
}
