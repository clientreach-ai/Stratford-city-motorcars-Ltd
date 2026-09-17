import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { vehicle } from "./inventory";

/**
 * Website enquiries and the dealership's follow-up.
 *
 * Holds personal data (name, contact details, message). Only the admin reads
 * it, behind authentication. `payload` is the validated form submission; the
 * extracted columns exist for listing and follow-up. Statuses, reasons and
 * valuation shapes are defined in packages/core/src/enquiry.ts.
 */

export const customer = pgTable(
  "customer",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    /** Lower-cased email, for grouping enquiries into customers. */
    emailKey: text("email_key"),
    /** Phone digits only, for grouping enquiries into customers. */
    phoneKey: text("phone_key"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("customer_email_key_idx").on(table.emailKey), index("customer_phone_key_idx").on(table.phoneKey)],
);

export const lead = pgTable(
  "lead",
  {
    id: text("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    kind: text("kind").notNull(),
    /** new | contacted | viewing-arranged | sold | not-proceeding */
    status: text("status").notNull().default("new"),
    closedReason: text("closed_reason"),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    vehicleSlug: text("vehicle_slug"),
    payload: jsonb("payload").notNull(),
    customerId: text("customer_id").references(() => customer.id, { onDelete: "set null" }),
    handledBy: text("handled_by").references(() => user.id, { onDelete: "set null" }),
    /** Part exchanges only: `Valuation`. */
    valuation: jsonb("valuation"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    firstRepliedAt: timestamp("first_replied_at", { withTimezone: true }),
  },
  (table) => [
    index("lead_created_at_idx").on(table.createdAt),
    index("lead_status_idx").on(table.status),
    index("lead_customer_id_idx").on(table.customerId),
  ],
);

/** Everything that happened to an enquiry, newest last. */
export const leadActivity = pgTable(
  "lead_activity",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => lead.id, { onDelete: "cascade" }),
    /** created | note | status | assigned | valuation | appointment */
    type: text("type").notNull(),
    body: text("body").notNull(),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("lead_activity_lead_id_idx").on(table.leadId)],
);

/** Viewings and test drives the dealership has arranged. */
export const appointment = pgTable(
  "appointment",
  {
    id: text("id").primaryKey(),
    /** viewing | test-drive */
    type: text("type").notNull(),
    /** requested | confirmed | completed | no-show | cancelled */
    status: text("status").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    vehicleId: text("vehicle_id").references(() => vehicle.id, { onDelete: "set null" }),
    customerId: text("customer_id").references(() => customer.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    enquiryId: text("enquiry_id").references(() => lead.id, { onDelete: "set null" }),
    handledBy: text("handled_by").references(() => user.id, { onDelete: "set null" }),
    notes: text("notes").notNull().default(""),
    /** `TestDriveChecks`. */
    checks: jsonb("checks").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("appointment_starts_at_idx").on(table.startsAt)],
);
