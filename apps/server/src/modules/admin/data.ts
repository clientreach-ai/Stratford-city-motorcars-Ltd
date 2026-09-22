import { asc, tables, type Database } from "@Stratford-city-motorcars-Ltd/db";
import type { Appointment, AppointmentStatus, AppointmentType, TestDriveChecks } from "@Stratford-city-motorcars-Ltd/core/appointment";
import type { Customer } from "@Stratford-city-motorcars-Ltd/core/customer";
import {
  isOpenEnquiry,
  type ActivityType,
  type ClosedReason,
  type Enquiry,
  type EnquiryActivity,
  type EnquiryKind,
  type EnquiryPayload,
  type EnquiryStatus,
  type Valuation,
} from "@Stratford-city-motorcars-Ltd/core/enquiry";
import { can } from "@Stratford-city-motorcars-Ltd/core/permissions";
import { coverPreview, listingProgress, type AdminVehicle } from "@Stratford-city-motorcars-Ltd/core/stock";
import type { MemberStatus, SessionUser, TeamMember } from "@Stratford-city-motorcars-Ltd/core/team";

import { db } from "../../lib/db";
import { listVehicles, type StoredVehicle } from "../vehicles/repository";
import { toRole } from "./context";

/**
 * Loading and shaping admin records.
 *
 * A dealership holds tens of cars and a few thousand enquiries at most, so the
 * admin reads whole tables and computes lists, counts and links in memory —
 * the same way the reference implementation in apps/admin/src/lib/api/mock
 * does. Move filtering into SQL if the tables ever grow past that.
 */

export type Executor = Pick<Database, "select" | "insert" | "update" | "delete">;

const { user, lead, leadActivity, appointment, customer } = tables;

export type LeadRow = typeof lead.$inferSelect;
export type AppointmentRow = typeof appointment.$inferSelect;
export type CustomerRow = typeof customer.$inferSelect;

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

// ---- Team -------------------------------------------------------------------------

export async function loadMembers(executor: Executor = db): Promise<TeamMember[]> {
  const rows = await executor.select().from(user).orderBy(asc(user.createdAt));
  return rows.map(toMember);
}

export function toMember(row: typeof user.$inferSelect): TeamMember {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: toRole(row.role),
    status: (["active", "invited", "deactivated"].includes(row.status) ? row.status : "deactivated") as MemberStatus,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: iso(row.lastActiveAt),
  };
}

// ---- Vehicles ------------------------------------------------------------------------

export function vehicleBySlug(vehicles: StoredVehicle[], slug: string | null | undefined): StoredVehicle | undefined {
  if (!slug) return undefined;
  return (
    vehicles.find((item) => item.record.slug === slug) ??
    vehicles.find((item) => item.record.previousSlugs.includes(slug))
  );
}

export function toAdminVehicle(stored: StoredVehicle, leads: LeadRow[], vehicles: StoredVehicle[], member: SessionUser): AdminVehicle {
  const openEnquiryCount = leads.filter(
    (row) => isOpenEnquiry(row.status as EnquiryStatus) && vehicleBySlug(vehicles, row.vehicleSlug)?.record.id === stored.record.id,
  ).length;
  const sale = stored.sale && !can(member.role, "stock.salePrice") ? { ...stored.sale, salePrice: null } : stored.sale;
  return { ...stored.record, reservation: stored.reservation, sale, openEnquiryCount };
}

export const vehicleTitle = (stored: StoredVehicle | undefined) =>
  stored ? [stored.record.year, stored.record.title].filter(Boolean).join(" ") : null;

// ---- Enquiries -------------------------------------------------------------------------

export async function loadLeads(executor: Executor = db): Promise<LeadRow[]> {
  return executor.select().from(lead);
}

export function toEnquiry(row: LeadRow, vehicles: StoredVehicle[]): Enquiry {
  const match = vehicleBySlug(vehicles, row.vehicleSlug);
  const record = match?.record;
  return {
    id: row.id,
    reference: row.reference,
    kind: row.kind as EnquiryKind,
    status: row.status as EnquiryStatus,
    closedReason: (row.closedReason as ClosedReason | null) ?? null,
    name: row.name,
    email: row.email,
    phone: row.phone,
    vehicleSlug: row.vehicleSlug,
    vehicle: record
      ? {
          id: record.id,
          slug: record.slug,
          title: record.title,
          year: record.year,
          status: record.status,
          reserved: record.reserved,
          price: record.price,
          priceOnApplication: record.priceOnApplication,
          coverSrc: coverPreview(listingProgress(record).cover),
        }
      : null,
    customerId: row.customerId,
    handledBy: row.handledBy,
    valuation: (row.valuation as Valuation | null) ?? null,
    payload: row.payload as EnquiryPayload,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    firstRepliedAt: iso(row.firstRepliedAt),
  };
}

export function toActivity(row: typeof leadActivity.$inferSelect): EnquiryActivity {
  return {
    id: row.id,
    type: row.type as ActivityType,
    body: row.body,
    authorId: row.authorId,
    authorName: row.authorName,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Records one entry in an enquiry's history. `member` null means the website itself. */
export async function logActivity(
  executor: Executor,
  leadId: string,
  member: SessionUser | null,
  type: ActivityType,
  body: string,
): Promise<EnquiryActivity> {
  const [row] = await executor
    .insert(leadActivity)
    .values({
      id: crypto.randomUUID(),
      leadId,
      type,
      body,
      authorId: member?.id ?? null,
      authorName: member?.name ?? "Website",
      createdAt: new Date(),
    })
    .returning();
  return toActivity(row!);
}

// ---- Appointments -------------------------------------------------------------------------

export async function loadAppointments(executor: Executor = db): Promise<AppointmentRow[]> {
  return executor.select().from(appointment).orderBy(asc(appointment.startsAt));
}

export function toAppointment(row: AppointmentRow, vehicles: StoredVehicle[], leads: Pick<LeadRow, "id" | "reference">[]): Appointment {
  return {
    id: row.id,
    type: row.type as AppointmentType,
    status: row.status as AppointmentStatus,
    startsAt: row.startsAt.toISOString(),
    durationMinutes: row.durationMinutes,
    vehicleId: row.vehicleId,
    vehicleTitle: vehicleTitle(vehicles.find((item) => item.record.id === row.vehicleId)),
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    enquiryId: row.enquiryId,
    enquiryReference: leads.find((item) => item.id === row.enquiryId)?.reference ?? null,
    handledBy: row.handledBy,
    notes: row.notes,
    checks: row.checks as TestDriveChecks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---- Customers -------------------------------------------------------------------------------

export async function loadCustomers(executor: Executor = db): Promise<CustomerRow[]> {
  return executor.select().from(customer);
}

export function toCustomer(row: CustomerRow, leads: LeadRow[], appointments: AppointmentRow[], vehicles: StoredVehicle[]): Customer {
  const enquiries = leads.filter((item) => item.customerId === row.id);
  const booked = appointments.filter((item) => item.customerId === row.id);
  const purchases = vehicles.filter((item) => item.sale?.customerId === row.id);
  const now = Date.now();
  const times = [
    row.updatedAt.toISOString(),
    ...enquiries.map((item) => item.updatedAt.toISOString()),
    ...booked.filter((item) => item.startsAt.getTime() <= now).map((item) => item.startsAt.toISOString()),
    ...purchases.map((item) => item.sale!.soldAt),
  ];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastActivityAt: times.sort().at(-1) ?? row.createdAt.toISOString(),
    enquiryCount: enquiries.length,
    openEnquiryCount: enquiries.filter((item) => isOpenEnquiry(item.status as EnquiryStatus)).length,
    appointmentCount: booked.length,
    purchaseCount: purchases.length,
  };
}

// ---- Search -------------------------------------------------------------------------------------

/**
 * Case-insensitive text match, plus phone-style digit matching for 4+ digits.
 *
 * Spaces and punctuation are ignored on both sides, so "AB12CDE" finds
 * "AB12 CDE", and UK numbers are compared in one form, so a number stored as
 * "+44 7700 900123" is found by "07700 900123" and the other way round.
 */
export function matches(needle: string, ...values: (string | null | undefined)[]): boolean {
  const query = needle.trim().toLowerCase();
  if (!query) return true;
  const squashed = squash(query);
  const digits = ukDigits(query);
  return values.some((value) => {
    if (!value) return false;
    const text = value.toLowerCase();
    if (text.includes(query)) return true;
    if (squashed.length >= 2 && squash(text).includes(squashed)) return true;
    return digits.length >= 4 && ukDigits(text).includes(digits);
  });
}

/** Letters and digits only: "AB12 CDE" and "ab12-cde" both become "ab12cde". */
function squash(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

/** Phone digits in one UK form, so +44… and 0… compare equal. */
function ukDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("44") ? `0${digits.slice(2)}` : digits;
}

export { listVehicles };
