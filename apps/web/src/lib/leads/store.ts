import "server-only";

import { getDb, recordWebsiteEnquiry } from "@Stratford-city-motorcars-Ltd/db";

import type { LeadInput } from "@/lib/forms/schemas";
import { getVehicleBySlug } from "@/lib/inventory/repository";
import { databaseUrl } from "@/lib/inventory/store";

/** The showroom's time zone: the customer picks a local date and time. */
const TIME_ZONE = "Europe/London";

/**
 * Enquiries kept in the database, with their first activity entry and the
 * link to a customer, so they appear in the admin (see packages/db).
 *
 * The stored payload is the validated submission minus the honeypot. No IP
 * address or browser fingerprint is kept: nothing here is needed to reply to a
 * customer.
 */

export function leadStorageAvailable(): boolean {
  return Boolean(databaseUrl());
}

export async function insertLead(lead: LeadInput, reference: string): Promise<void> {
  const url = databaseUrl();
  if (!url) throw new Error("Lead storage is not configured");

  const { website: _honeypot, ...payload } = lead;
  const vehicleSlug = "vehicleSlug" in lead && lead.vehicleSlug ? lead.vehicleSlug : null;
  await recordWebsiteEnquiry(getDb(url), {
    reference,
    kind: lead.kind,
    name: lead.name,
    email: "email" in lead ? lead.email : null,
    phone: "phone" in lead && lead.phone ? lead.phone : null,
    vehicleSlug,
    payload,
    appointment: await requestedAppointment(lead, vehicleSlug),
  });
}

/**
 * The start of each time band the enquiry form offers, in showroom local time.
 * The customer picks a band, not a clock time; staff set the exact time when
 * they confirm.
 */
const BAND_START_HOUR: Record<string, number> = {
  "Weekday, 12pm–2pm": 12,
  "Weekday, 2pm–5pm": 14,
  "Weekend, by appointment": 11,
  "Outside opening hours": 18,
  "Any time — call me to arrange": 12,
};

/** Viewings and test drives asked for on the website, for the admin's diary. */
async function requestedAppointment(lead: LeadInput, vehicleSlug: string | null) {
  if (lead.kind !== "vehicle-enquiry") return undefined;
  if (lead.requestType !== "viewing" && lead.requestType !== "test-drive") return undefined;
  if (!lead.preferredDate) return undefined;

  const hour = BAND_START_HOUR[lead.preferredTime ?? ""] ?? 12;
  const startsAt = londonDate(lead.preferredDate, `${String(hour).padStart(2, "0")}:00`);
  if (!startsAt) return undefined;

  const vehicle = vehicleSlug ? await getVehicleBySlug(vehicleSlug) : null;
  return {
    type: lead.requestType,
    startsAt,
    durationMinutes: lead.requestType === "test-drive" ? 60 : 45,
    vehicleId: vehicle?.id ?? null,
  } as const;
}

/** A "YYYY-MM-DD" date and "HH:MM" showroom time as a real instant. */
function londonDate(date: string, time: string): Date | null {
  const naive = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  // How far ahead of UTC London is that day: +1 hour in summer, 0 in winter.
  // Both sides are read back in the server's own zone, so it cancels out.
  const asUtc = new Date(naive.toLocaleString("en-US", { timeZone: "UTC" }));
  const asLondon = new Date(naive.toLocaleString("en-US", { timeZone: TIME_ZONE }));
  return new Date(naive.getTime() - (asLondon.getTime() - asUtc.getTime()));
}
