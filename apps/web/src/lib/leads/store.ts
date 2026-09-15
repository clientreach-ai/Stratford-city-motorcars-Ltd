import "server-only";

import { randomUUID } from "node:crypto";

import { getDb, tables } from "@Stratford-city-motorcars-Ltd/db";

import type { LeadInput } from "@/lib/forms/schemas";
import { databaseUrl } from "@/lib/inventory/store";

/**
 * Enquiries kept in the database.
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
  await getDb(url)
    .insert(tables.lead)
    .values({
      id: randomUUID(),
      reference,
      kind: lead.kind,
      status: "new",
      name: lead.name,
      email: "email" in lead ? lead.email : null,
      phone: "phone" in lead && lead.phone ? lead.phone : null,
      vehicleSlug: "vehicleSlug" in lead && lead.vehicleSlug ? lead.vehicleSlug : null,
      payload,
    });
}
