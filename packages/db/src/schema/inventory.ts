import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Vehicles, stored as validated documents.
 *
 * The full record lives in `record` (jsonb) and is validated by the web app's
 * vehicle schema on every read and write. The columns alongside it exist for
 * uniqueness and filtering and are kept in step with the document on save.
 * A dealership holding tens of cars does not need a column per specification
 * field, and a document lets the listing format grow without a migration for
 * every new field.
 */
export const vehicle = pgTable(
  "vehicle",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    status: text("status").notNull(),
    featured: boolean("featured").notNull().default(false),
    record: jsonb("record").notNull(),
    /**
     * Dealership-only facts, kept outside `record` so they can never reach a
     * public page: who the car is held for (`Reservation`) and what it sold
     * for (`SaleRecord`), as defined in packages/core/src/stock.ts.
     */
    reservation: jsonb("reservation"),
    sale: jsonb("sale"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("vehicle_status_idx").on(table.status)],
);
