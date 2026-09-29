import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/** Editable business settings, one JSON document per key (e.g. `business`). */
export const setting = pgTable("setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Single-use links that let an invited team member set their password.
 * Only a SHA-256 hash of the token is stored.
 */
export const teamInvitation = pgTable("team_invitation", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * That something was deleted, and why — never what it said. An enquiry or a
 * customer can be removed for spam or on an erasure request; this is how the
 * dealership can later show the request was carried out, without keeping the
 * personal details it removed. The enquiry's reference carries none.
 */
export const deletionLog = pgTable("deletion_log", {
  id: text("id").primaryKey(),
  /** "enquiry" or "customer". */
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  reference: text("reference"),
  reason: text("reason").notNull(),
  deletedBy: text("deleted_by").references(() => user.id, { onDelete: "set null" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).defaultNow().notNull(),
});
