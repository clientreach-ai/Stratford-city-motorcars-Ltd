import "server-only";

import { getDb, tables } from "@Stratford-city-motorcars-Ltd/db";
import { desc, eq } from "drizzle-orm";

import { parseVehicleRecord } from "../schema";
import { SlugConflictError, type InventoryStore } from "../store";
import type { VehicleRecord } from "../types";

/** Postgres-backed store. Records are validated on every read and write. */
export function createPostgresStore(connectionString: string): InventoryStore {
  const db = getDb(connectionString);
  const { vehicle } = tables;

  function parseRow(row: { id: string; record: unknown }): VehicleRecord | null {
    try {
      return parseVehicleRecord(row.record);
    } catch (error) {
      // A malformed document must never reach a page. Log the id and the
      // failing paths only — records contain no personal data, but keep logs lean.
      const issues =
        error && typeof error === "object" && "issues" in error
          ? (error as { issues: { path: PropertyKey[] }[] }).issues.map((issue) => issue.path.join("."))
          : [];
      console.error(`[inventory] vehicle ${row.id} failed validation and was skipped`, issues);
      return null;
    }
  }

  return {
    kind: "postgres",
    writable: true,

    async list() {
      const rows = await db
        .select({ id: vehicle.id, record: vehicle.record })
        .from(vehicle)
        .orderBy(desc(vehicle.updatedAt));
      return rows.map(parseRow).filter((record): record is VehicleRecord => record !== null);
    },

    async getById(id) {
      const [row] = await db
        .select({ id: vehicle.id, record: vehicle.record })
        .from(vehicle)
        .where(eq(vehicle.id, id))
        .limit(1);
      return row ? parseRow(row) : null;
    },

    async save(input) {
      const record = parseVehicleRecord(input);
      const values = {
        id: record.id,
        slug: record.slug,
        status: record.status,
        featured: record.featured,
        record,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      };

      try {
        await db
          .insert(vehicle)
          .values(values)
          .onConflictDoUpdate({
            target: vehicle.id,
            set: {
              slug: values.slug,
              status: values.status,
              featured: values.featured,
              record: values.record,
              updatedAt: values.updatedAt,
            },
          });
      } catch (error) {
        if (isUniqueViolation(error, "vehicle_slug_unique")) throw new SlugConflictError(record.slug);
        throw error;
      }

      return record;
    },
  };
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const candidates = [error, (error as { cause?: unknown })?.cause];
  return candidates.some(
    (candidate) =>
      !!candidate &&
      typeof candidate === "object" &&
      (candidate as { code?: string }).code === "23505" &&
      (candidate as { constraint?: string }).constraint === constraint,
  );
}

