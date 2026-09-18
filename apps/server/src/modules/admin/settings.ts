import { eq, tables } from "@Stratford-city-motorcars-Ltd/db";
import { ValidationError } from "@Stratford-city-motorcars-Ltd/core/errors";
import type { BusinessDetails, Settings } from "@Stratford-city-motorcars-Ltd/core/settings";
import { env } from "@Stratford-city-motorcars-Ltd/env/server";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../../lib/db";
import { revalidateWebsite } from "../../lib/revalidate";
import { validate } from "../../lib/validation";
import { getMediaStorage } from "../media/storage";
import { checkVersion, requireCapability, stamp, type AdminEnv } from "./context";

/**
 * Business settings — see "Settings" in the contract.
 *
 * Until they are first saved, the business details are the published facts in
 * apps/web/src/lib/site.ts (copied below). A save is stored here and the
 * website reads it through `apps/web/src/lib/settings.ts`, so the header,
 * footer, contact page and structured data follow the owner's edits.
 *
 * `integrations` is reported from this server's configuration; `compliance`
 * mirrors the developer-controlled switches in site.ts and is read-only.
 */

const { setting } = tables;
const KEY = "business";

const DEFAULT_BUSINESS: BusinessDetails = {
  name: "Stratford City Motorcars",
  phoneDisplay: "+44 7722 116355",
  phoneE164: "+447722116355",
  whatsappNumber: "447722116355",
  email: "stratfordcitymotorcars@gmail.com",
  street: "21–25 Romford Road",
  locality: "London",
  postcode: "E15 4LJ",
  parking: "Free parking on site.",
  hours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "12:00",
    closes: "17:00",
    weekendNote: "Appointment only",
    bankHolidayNote: "By appointment",
    outOfHoursNote: "To arrange a viewing outside these hours, message us on WhatsApp or send a text.",
  },
};

/** The version of the unsaved defaults. Fixed, so a first save can match it. */
const DEFAULT_UPDATED_AT = new Date("2026-09-01T00:00:00.000Z");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);

const businessSchema = z.object({
  name: text(120),
  phoneDisplay: text(30),
  phoneE164: z.string().trim(),
  whatsappNumber: z.string().trim(),
  email: text(160),
  street: text(160),
  locality: text(80),
  postcode: z.string().trim(),
  parking: text(200),
  hours: z.object({
    days: z.array(z.enum(DAYS)).max(7),
    opens: z.string(),
    closes: z.string(),
    weekendNote: text(200),
    bankHolidayNote: text(200),
    outOfHoursNote: text(300),
  }),
});

const updateBody = z.object({ business: businessSchema, expectedUpdatedAt: z.string().min(1) });

async function loadBusiness(): Promise<{ business: BusinessDetails; updatedAt: Date }> {
  const [row] = await db.select().from(setting).where(eq(setting.key, KEY)).limit(1);
  return row
    ? { business: row.value as BusinessDetails, updatedAt: row.updatedAt }
    : { business: DEFAULT_BUSINESS, updatedAt: DEFAULT_UPDATED_AT };
}

function toSettings(business: BusinessDetails, updatedAt: Date): Settings {
  return {
    business,
    integrations: {
      storage: "connected",
      notifications: [
        { channel: "webhook", configured: Boolean(env.LEADS_WEBHOOK_URL) },
        { channel: "email", configured: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM && env.ENQUIRY_EMAIL_TO) },
        // Texts still need a provider (or the webhook above).
        { channel: "sms", configured: false },
      ],
      media: getMediaStorage() ? "object-storage" : "local-disk",
    },
    compliance: {
      financePromotions: {
        enabled: false,
        detail: "Needs the firm's approved FCA status wording and a lender before any monthly figure can be shown.",
      },
      reservations: {
        enabled: false,
        depositGbp: null,
        detail: "Needs a payment provider, a confirmed deposit amount and approved refund terms.",
      },
      vatNumber: null,
      companyNumber: "15481206",
    },
    updatedAt: updatedAt.toISOString(),
  };
}

function validateBusiness(input: BusinessDetails): void {
  const fields: Record<string, string> = {};
  if (input.name.length < 2) fields.name = "Add the business name.";
  if (!/^\+44\d{9,10}$/.test(input.phoneE164)) fields.phoneE164 = "Use the international format, e.g. +447700900123.";
  if (!/^44\d{9,10}$/.test(input.whatsappNumber)) fields.whatsappNumber = "Use digits only, starting 44, e.g. 447700900123.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) fields.email = "That doesn't look like an email address.";
  if (!/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(input.postcode)) fields.postcode = "Enter a valid UK postcode.";
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(input.hours.opens)) fields["hours.opens"] = "Use 24-hour time, e.g. 12:00.";
  if (!time.test(input.hours.closes)) fields["hours.closes"] = "Use 24-hour time, e.g. 17:00.";
  else if (input.hours.closes <= input.hours.opens) fields["hours.closes"] = "Closing time must be after opening time.";
  if (input.hours.days.length === 0) fields["hours.days"] = "Choose at least one opening day.";
  if (Object.keys(fields).length) throw new ValidationError(fields);
}

export const settingsRoutes = new Hono<AdminEnv>()
  .get("/", async (c) => {
    const { business, updatedAt } = await loadBusiness();
    return c.json(toSettings(business, updatedAt));
  })

  .put("/business", validate("json", updateBody), async (c) => {
    requireCapability(c, "settings.edit");
    const { business: input, expectedUpdatedAt } = c.req.valid("json");
    const business: BusinessDetails = {
      ...input,
      postcode: input.postcode.toUpperCase(),
      hours: { ...input.hours, days: DAYS.filter((day) => input.hours.days.includes(day)) },
    };
    validateBusiness(business);

    const saved = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(setting).where(eq(setting.key, KEY)).for("update").limit(1);
      const current = row?.updatedAt ?? DEFAULT_UPDATED_AT;
      checkVersion(current, expectedUpdatedAt);
      const updatedAt = stamp(current);
      await tx
        .insert(setting)
        .values({ key: KEY, value: business, updatedAt })
        .onConflictDoUpdate({ target: setting.key, set: { value: business, updatedAt } });
      return updatedAt;
    });
    // The website caches these facts; drop that cache so the change shows now.
    revalidateWebsite("settings");
    return c.json(toSettings(business, saved));
  });
