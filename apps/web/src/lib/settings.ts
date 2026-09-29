import "server-only";

import { getDb, eq, tables } from "@Stratford-city-motorcars-Ltd/db";
import type { BusinessDetails, OpeningHours } from "@Stratford-city-motorcars-Ltd/core/settings";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { z } from "zod";

import { databaseUrl } from "./inventory/store";
import { DEFAULT_BUSINESS, buildSite, mapLinksFor, type Site } from "./site";

/**
 * Business details as the owner saves them in the admin.
 *
 * The admin writes them to the `setting` table; the website reads them here and
 * rebuilds `site` from them, so a change to the phone number, address or
 * opening hours reaches the header, footer, contact page and structured data.
 * Anything not stored or not valid — and everything when there is no database
 * — falls back to the confirmed facts in `site.ts`.
 *
 * Cached under the `settings` tag, which the API revalidates after a save, with
 * the same five-minute safety net the inventory cache uses.
 */

export const SETTINGS_CACHE_TAG = "settings";

/** The stored key. Must match the API's (`apps/server/src/modules/admin/settings.ts`). */
const KEY = "business";

const loadStoredBusiness = unstable_cache(
  async (): Promise<unknown> => {
    const url = databaseUrl();
    if (!url) return null;
    // A failed read throws rather than returning a fallback: whatever this
    // returns is cached, so a fallback would keep the defaults on the site for
    // five minutes after the database recovered. `getBusiness()` catches it.
    const [row] = await getDb(url).select().from(tables.setting).where(eq(tables.setting.key, KEY)).limit(1);
    return row?.value ?? null;
  },
  ["business-settings"],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 300 },
);

// ---- Validation -------------------------------------------------------------
//
// The stored row is JSON the website did not write, and its values end up in
// tel: and wa.me links and the structured data. Each field is checked on its
// own, to the rules the API applies when saving, so one bad value falls back
// to the confirmed fact without discarding the owner's other edits.

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const filled = z.string().trim().min(1);
/** Notes the owner may deliberately leave blank. */
const note = z.string().trim();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const businessFields = {
  name: filled,
  phoneDisplay: filled,
  phoneE164: z.string().regex(/^\+44\d{9,10}$/),
  whatsappNumber: z.string().regex(/^44\d{9,10}$/),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  street: filled,
  locality: filled,
  postcode: z.string().trim().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i),
  parking: note,
} satisfies { [K in Exclude<keyof BusinessDetails, "hours">]: z.ZodType<BusinessDetails[K]> };

const hoursFields = {
  days: z.array(z.enum(DAYS)).min(1),
  opens: time,
  closes: time,
  weekendNote: note,
  bankHolidayNote: note,
  outOfHoursNote: note,
} satisfies { [K in keyof OpeningHours]: z.ZodType<OpeningHours[K]> };

const object = z.record(z.string(), z.unknown());

/** Each valid stored field over its default; the names of rejected fields are added to `rejected`. */
function merge<T extends object>(
  fields: { [K in keyof T]: z.ZodType<T[K]> },
  stored: unknown,
  defaults: T,
  rejected: string[],
  path?: string,
): T {
  const result = { ...defaults };
  if (stored === undefined || stored === null) return result;
  const values = object.safeParse(stored);
  if (!values.success) {
    rejected.push(path ?? "the whole row");
    return result;
  }
  for (const key of Object.keys(fields) as (keyof T & string)[]) {
    if (values.data[key] === undefined) continue;
    const parsed = fields[key].safeParse(values.data[key]);
    if (parsed.success) result[key] = parsed.data;
    else rejected.push(path ? `${path}.${key}` : key);
  }
  return result;
}

const warned = new Set<string>();

/** The stored details, field by field, over the confirmed facts. */
function toBusiness(stored: unknown): BusinessDetails {
  const rejected: string[] = [];
  const { hours: defaultHours, ...defaultFields } = DEFAULT_BUSINESS;
  const fields = merge(businessFields, stored, defaultFields, rejected);
  const storedHours = object.safeParse(stored).data?.hours;
  const hours = merge(hoursFields, storedHours, defaultHours, rejected, "hours");
  // Opening and closing times only make sense as a pair.
  if (hours.closes <= hours.opens) {
    hours.opens = defaultHours.opens;
    hours.closes = defaultHours.closes;
    rejected.push("hours.opens/closes");
  }

  // Field names only, once per distinct problem, so a bad row is noticed
  // without the log filling up on every render.
  const problem = rejected.join(", ");
  if (problem && !warned.has(problem)) {
    warned.add(problem);
    console.warn(`[settings] invalid stored business details; using the published defaults for: ${problem}`);
  }

  return { ...fields, hours };
}

/**
 * The dealership's business details: saved settings over the confirmed facts.
 * Read once per render: a failed read is not cached, so without this every
 * header, footer and structured-data block would ask the database again.
 */
export const getBusiness = cache(async (): Promise<BusinessDetails> => {
  let stored: unknown;
  try {
    stored = await loadStoredBusiness();
  } catch (error) {
    // Never take a page down over settings: fall back to the confirmed facts.
    // Caught outside the cache, so the next render asks the database again.
    console.error("[settings] could not be read; using the published defaults", error instanceof Error ? error.message : error);
    return DEFAULT_BUSINESS;
  }
  return toBusiness(stored);
});

/** `site`, rebuilt from the saved settings. Use this wherever a page shows business facts. */
export async function getSite(): Promise<Site> {
  return buildSite(await getBusiness());
}

/** Google Maps links for the saved address. */
export async function getMapLinks() {
  const business = await getSite();
  return mapLinksFor(business.address.full);
}
