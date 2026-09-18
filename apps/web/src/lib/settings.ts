import "server-only";

import { getDb, eq, tables } from "@Stratford-city-motorcars-Ltd/db";
import type { BusinessDetails } from "@Stratford-city-motorcars-Ltd/core/settings";
import { unstable_cache } from "next/cache";

import { databaseUrl } from "./inventory/store";
import { DEFAULT_BUSINESS, buildSite, mapLinksFor, type Site } from "./site";

/**
 * Business details as the owner saves them in the admin.
 *
 * The admin writes them to the `setting` table; the website reads them here and
 * rebuilds `site` from them, so a change to the phone number, address or
 * opening hours reaches the header, footer, contact page and structured data.
 * Anything not stored — and everything when there is no database — falls back
 * to the confirmed facts in `site.ts`.
 *
 * Cached under the `settings` tag, which the API revalidates after a save, with
 * the same five-minute safety net the inventory cache uses.
 */

export const SETTINGS_CACHE_TAG = "settings";

/** The stored key. Must match the API's (`apps/server/src/modules/admin/settings.ts`). */
const KEY = "business";

const loadBusiness = unstable_cache(
  async (): Promise<BusinessDetails | null> => {
    const url = databaseUrl();
    if (!url) return null;
    try {
      const [row] = await getDb(url).select().from(tables.setting).where(eq(tables.setting.key, KEY)).limit(1);
      return (row?.value as BusinessDetails | undefined) ?? null;
    } catch (error) {
      // Never take a page down over settings: fall back to the confirmed facts.
      console.error("[settings] could not be read; using the published defaults", error instanceof Error ? error.message : error);
      return null;
    }
  },
  ["business-settings"],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 300 },
);

/** The dealership's business details: saved settings over the confirmed facts. */
export async function getBusiness(): Promise<BusinessDetails> {
  const stored = await loadBusiness();
  if (!stored) return DEFAULT_BUSINESS;
  return {
    ...DEFAULT_BUSINESS,
    ...stored,
    hours: { ...DEFAULT_BUSINESS.hours, ...stored.hours },
  };
}

/** `site`, rebuilt from the saved settings. Use this wherever a page shows business facts. */
export async function getSite(): Promise<Site> {
  return buildSite(await getBusiness());
}

/** Google Maps links for the saved address. */
export async function getMapLinks() {
  const business = await getSite();
  return mapLinksFor(business.address.full);
}
