import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Website enquiries.
 *
 * Holds personal data (name, contact details, message). Only the dashboard
 * reads it, behind authentication. `payload` is the validated form submission;
 * the extracted columns exist for listing and follow-up.
 */
export const lead = pgTable(
  "lead",
  {
    id: text("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    kind: text("kind").notNull(),
    /** new | contacted | closed */
    status: text("status").notNull().default("new"),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    vehicleSlug: text("vehicle_slug"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("lead_created_at_idx").on(table.createdAt)],
);
