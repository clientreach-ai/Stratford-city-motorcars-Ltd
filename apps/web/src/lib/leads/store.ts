import "server-only";

import { randomUUID } from "node:crypto";

import { getDb, tables } from "@Stratford-city-motorcars-Ltd/db";
import { desc, eq, sql } from "drizzle-orm";

import type { LeadInput } from "@/lib/forms/schemas";
import { databaseUrl } from "@/lib/inventory/store";

/**
 * Enquiries kept in the database, read by the dashboard.
 *
 * The stored payload is the validated submission minus the honeypot. No IP
 * address or browser fingerprint is kept: nothing here is needed to reply to a
 * customer.
 */

export const LEAD_STATUSES = ["new", "contacted", "closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface StoredLead {
  id: string;
  reference: string;
  kind: LeadInput["kind"];
  status: LeadStatus;
  name: string;
  email: string | null;
  phone: string | null;
  vehicleSlug: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

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

export async function listRecentLeads(limit = 50): Promise<StoredLead[]> {
  const url = databaseUrl();
  if (!url) return [];
  const rows = await getDb(url).select().from(tables.lead).orderBy(desc(tables.lead.createdAt)).limit(limit);
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    kind: row.kind as StoredLead["kind"],
    status: (LEAD_STATUSES as readonly string[]).includes(row.status) ? (row.status as LeadStatus) : "new",
    name: row.name,
    email: row.email,
    phone: row.phone,
    vehicleSlug: row.vehicleSlug,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function countNewLeads(): Promise<number | null> {
  const url = databaseUrl();
  if (!url) return null;
  const [row] = await getDb(url)
    .select({ count: sql<number>`count(*)::int` })
    .from(tables.lead)
    .where(eq(tables.lead.status, "new"));
  return row?.count ?? 0;
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const url = databaseUrl();
  if (!url) throw new Error("Lead storage is not configured");
  await getDb(url).update(tables.lead).set({ status }).where(eq(tables.lead.id, id));
}
